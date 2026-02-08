class DomeGallery {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        // Default constraints
        this.defaults = {
            maxVerticalRotationDeg: 5,
            dragSensitivity: 20,
            enlargeTransitionMs: 300,
            segments: 35
        };

        // Merge options
        this.config = {
            images: [],
            fit: 0.5,
            fitBasis: 'auto',
            minRadius: 600,
            maxRadius: Infinity,
            padFactor: 0.25,
            overlayBlurColor: '#060010',
            maxVerticalRotationDeg: this.defaults.maxVerticalRotationDeg,
            dragSensitivity: this.defaults.dragSensitivity,
            enlargeTransitionMs: this.defaults.enlargeTransitionMs,
            segments: this.defaults.segments,
            dragDampening: 2,
            openedImageWidth: '250px',
            openedImageHeight: '350px',
            imageBorderRadius: '30px',
            openedImageBorderRadius: '30px',
            grayscale: true,
            ...options
        };

        // State
        this.rotation = { x: 0, y: 0 };
        this.startRot = { x: 0, y: 0 };
        this.startPos = null;
        this.isDragging = false;
        this.hasMoved = false;
        this.inertiaRAF = null;
        this.isOpening = false;
        this.openStartedAt = 0;
        this.lastDragEndAt = 0;
        this.scrollLocked = false;
        this.focusedEl = null;
        this.originalTilePos = null;
        this.lockedRadius = 0;

        this.init();
    }

    init() {
        this.renderStructure();
        this.setupItems();
        this.setupObservers();
        this.setupEvents();
        this.applyTransform(this.rotation.x, this.rotation.y);
    }

    // --- DOM Structure ---
    renderStructure() {
        this.container.innerHTML = '';
        this.container.className = 'sphere-root';
        this.container.style.setProperty('--segments-x', this.config.segments);
        this.container.style.setProperty('--segments-y', this.config.segments);
        this.container.style.setProperty('--overlay-blur-color', this.config.overlayBlurColor);
        this.container.style.setProperty('--tile-radius', this.config.imageBorderRadius);
        this.container.style.setProperty('--enlarge-radius', this.config.openedImageBorderRadius);
        this.container.style.setProperty('--image-filter', this.config.grayscale ? 'grayscale(1)' : 'none');

        const main = document.createElement('main');
        main.className = 'sphere-main';
        this.mainRef = main;

        const stage = document.createElement('div');
        stage.className = 'stage';

        this.sphereRef = document.createElement('div');
        this.sphereRef.className = 'sphere';

        stage.appendChild(this.sphereRef);
        main.appendChild(stage);

        // Overlays
        const overlay = document.createElement('div');
        overlay.className = 'overlay';
        main.appendChild(overlay);

        const overlayBlur = document.createElement('div');
        overlayBlur.className = 'overlay overlay--blur';
        main.appendChild(overlayBlur);

        const edgeTop = document.createElement('div');
        edgeTop.className = 'edge-fade edge-fade--top';
        main.appendChild(edgeTop);

        const edgeBot = document.createElement('div');
        edgeBot.className = 'edge-fade edge-fade--bottom';
        main.appendChild(edgeBot);

        // Viewer
        this.viewerRef = document.createElement('div');
        this.viewerRef.className = 'viewer';

        this.scrimRef = document.createElement('div');
        this.scrimRef.className = 'scrim';
        this.viewerRef.appendChild(this.scrimRef);

        this.frameRef = document.createElement('div');
        this.frameRef.className = 'frame';
        this.viewerRef.appendChild(this.frameRef);

        main.appendChild(this.viewerRef);
        this.container.appendChild(main);
    }

    // --- Logic Props ---
    normalizeAngle(d) {
        return ((d % 360) + 360) % 360;
    }

    wrapAngleSigned(deg) {
        const a = (((deg + 180) % 360) + 360) % 360;
        return a - 180;
    }

    clamp(v, min, max) {
        return Math.min(Math.max(v, min), max);
    }

    // --- Item Building ---
    buildItems(pool, seg) {
        const xCols = Array.from({ length: seg }, (_, i) => -37 + i * 2);
        const evenYs = [-4, -2, 0, 2, 4];
        const oddYs = [-3, -1, 1, 3, 5];

        const coords = xCols.flatMap((x, c) => {
            const ys = c % 2 === 0 ? evenYs : oddYs;
            return ys.map(y => ({ x, y, sizeX: 2, sizeY: 2 }));
        });

        const totalSlots = coords.length;
        if (pool.length === 0) {
            return coords.map(c => ({ ...c, src: '', alt: '' }));
        }

        // --- DUPLICATION LOGIC ---
        // If we have fewer images than slots, repeat them to fill the dome
        let usedImages = [];
        if (pool.length > 0) {
            // Normalize input
            const normalized = pool.map(img =>
                typeof img === 'string' ? { src: img, alt: '' } : { src: img.src || '', alt: img.alt || '' }
            );

            // Fill array
            usedImages = Array.from({ length: totalSlots }, (_, i) => normalized[i % normalized.length]);

            // Shuffle slightly to avoid obvious repeating patterns next to each other
            // Simple check: avoid identical neighbours
            for (let i = 1; i < usedImages.length; i++) {
                if (usedImages[i].src === usedImages[i - 1].src) {
                    for (let j = i + 1; j < usedImages.length; j++) {
                        if (usedImages[j].src !== usedImages[i].src) {
                            const tmp = usedImages[i];
                            usedImages[i] = usedImages[j];
                            usedImages[j] = tmp;
                            break;
                        }
                    }
                }
            }
        }

        return coords.map((c, i) => ({
            ...c,
            src: usedImages[i]?.src,
            alt: usedImages[i]?.alt
        }));
    }

    setupItems() {
        const items = this.buildItems(this.config.images, this.config.segments);

        items.forEach((it) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'item';

            // CSS Vars
            itemEl.style.setProperty('--offset-x', it.x);
            itemEl.style.setProperty('--offset-y', it.y);
            itemEl.style.setProperty('--item-size-x', it.sizeX);
            itemEl.style.setProperty('--item-size-y', it.sizeY);

            // Metadata for logic
            itemEl.dataset.offsetX = it.x;
            itemEl.dataset.offsetY = it.y;
            itemEl.dataset.sizeX = it.sizeX;
            itemEl.dataset.sizeY = it.sizeY;
            itemEl.dataset.src = it.src;

            const imgContainer = document.createElement('div');
            imgContainer.className = 'item__image';
            imgContainer.setAttribute('role', 'button');
            imgContainer.setAttribute('tabindex', '0');
            imgContainer.setAttribute('aria-label', it.alt || 'Open image');

            const img = document.createElement('img');
            img.src = it.src;
            img.alt = it.alt || '';
            img.draggable = false;

            imgContainer.appendChild(img);
            itemEl.appendChild(imgContainer);
            this.sphereRef.appendChild(itemEl);

            // Click listener on image container
            imgContainer.addEventListener('click', (e) => this.onTileClick(e));
            imgContainer.addEventListener('pointerup', (e) => this.onTilePointerUp(e));
        });
    }

    applyTransform(xDeg, yDeg) {
        if (this.sphereRef) {
            this.sphereRef.style.transform = `translateZ(calc(var(--radius) * -1)) rotateX(${xDeg}deg) rotateY(${yDeg}deg)`;
        }
    }

    // --- Resize Logic ---
    setupObservers() {
        if (!window.ResizeObserver) return;
        const ro = new ResizeObserver(entries => {
            const cr = entries[0].contentRect;
            const w = Math.max(1, cr.width);
            const h = Math.max(1, cr.height);
            const minDim = Math.min(w, h);
            const maxDim = Math.max(w, h); // unused but logic preserved
            const aspect = w / h;

            let basis;
            if (this.config.fitBasis === 'min') basis = minDim;
            else if (this.config.fitBasis === 'max') basis = maxDim;
            else if (this.config.fitBasis === 'width') basis = w;
            else if (this.config.fitBasis === 'height') basis = h;
            else basis = aspect >= 1.3 ? w : minDim;

            let radius = basis * this.config.fit;
            const heightGuard = h * 1.35;
            radius = Math.min(radius, heightGuard);
            radius = this.clamp(radius, this.config.minRadius, this.config.maxRadius);
            this.lockedRadius = Math.round(radius);

            const viewerPad = Math.max(8, Math.round(minDim * this.config.padFactor));

            this.container.style.setProperty('--radius', `${this.lockedRadius}px`);
            this.container.style.setProperty('--viewer-pad', `${viewerPad}px`);

            // Re-center active overlay if exists
            const enlargedOverlay = this.viewerRef.querySelector('.enlarge');
            if (enlargedOverlay) {
                const frameR = this.frameRef.getBoundingClientRect();
                const mainR = this.mainRef.getBoundingClientRect();
                // Simple re-centering logic
                enlargedOverlay.style.left = `${frameR.left - mainR.left}px`;
                enlargedOverlay.style.top = `${frameR.top - mainR.top}px`;
                enlargedOverlay.style.width = `${frameR.width}px`;
                enlargedOverlay.style.height = `${frameR.height}px`;
            }
        });
        ro.observe(this.container);
    }

    // --- Drag / Inertia ---
    setupEvents() {
        // Pointer events for drag (covers mouse & touch)
        this.mainRef.addEventListener('pointerdown', (e) => this.onPointerDown(e), { passive: false });
        // Global move/up to catch drag leaving element
        window.addEventListener('pointermove', (e) => this.onPointerMove(e), { passive: false });
        window.addEventListener('pointerup', (e) => this.onPointerUp(e));

        // Keydown for escape
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeViewer();
        });

        // Scrim click
        this.scrimRef.addEventListener('click', () => this.closeViewer());
    }

    onPointerDown(e) {
        if (this.focusedEl) return;
        // Avoid dragging if clicking interaction elements if any, but mainly text selection
        // preventDefault to stop text selection
        // e.preventDefault(); 

        this.stopInertia();
        this.isDragging = true;
        this.hasMoved = false;
        this.startRot = { ...this.rotation };
        this.startPos = { x: e.clientX, y: e.clientY };
        this.lastDragEndAt = 0; // reset
    }

    onPointerMove(e) {
        if (!this.isDragging || !this.startPos || this.focusedEl) return;

        const dxTotal = e.clientX - this.startPos.x;
        const dyTotal = e.clientY - this.startPos.y;

        if (!this.hasMoved) {
            const dist2 = dxTotal * dxTotal + dyTotal * dyTotal;
            if (dist2 > 16) this.hasMoved = true;
        }

        const nextX = this.clamp(
            this.startRot.x - dyTotal / this.config.dragSensitivity,
            -this.config.maxVerticalRotationDeg,
            this.config.maxVerticalRotationDeg
        );
        const nextY = this.wrapAngleSigned(this.startRot.y + dxTotal / this.config.dragSensitivity);

        if (this.rotation.x !== nextX || this.rotation.y !== nextY) {
            this.rotation = { x: nextX, y: nextY };
            this.applyTransform(nextX, nextY);
        }

        // Track velocity simply for now? 
        // Or implement robust velocity tracking... 
        // For simplicity, we can skip complex velocity logic unless requested.
        // But let's add simple tracking:
        if (!this.lastPos) this.lastPos = { x: e.clientX, y: e.clientY, time: Date.now() };
        else {
            const now = Date.now();
            const dt = now - this.lastPos.time;
            if (dt > 0) {
                this.velocity = {
                    x: (e.clientX - this.lastPos.x) / dt,
                    y: (e.clientY - this.lastPos.y) / dt
                };
                this.lastPos = { x: e.clientX, y: e.clientY, time: now };
            }
        }
    }

    onPointerUp(e) {
        if (!this.isDragging) return;
        this.isDragging = false;

        if (this.hasMoved) {
            this.lastDragEndAt = performance.now();
            // Trigger inertia
            // Velocity scale factor implies movement direction
            if (this.velocity) {
                // Invert X/Y for rotation axes
                // Drag X -> Rotate Y
                // Drag Y -> Rotate X
                this.startInertia(this.velocity.x * 12, this.velocity.y * 12);
            }
        }
        this.velocity = null;
        this.lastPos = null;
    }

    stopInertia() {
        if (this.inertiaRAF) {
            cancelAnimationFrame(this.inertiaRAF);
            this.inertiaRAF = null;
        }
    }

    startInertia(vx, vy) {
        const MAX_V = 1.4;
        let vX = this.clamp(vx, -MAX_V, MAX_V) * 80;
        let vY = this.clamp(vy, -MAX_V, MAX_V) * 80;
        let frames = 0;
        const d = this.clamp(this.config.dragDampening ?? 0.6, 0, 1);
        const frictionMul = 0.94 + 0.055 * d;
        const stopThreshold = 0.015 - 0.01 * d;
        const maxFrames = Math.round(90 + 270 * d);

        const step = () => {
            vX *= frictionMul;
            vY *= frictionMul;
            if (Math.abs(vX) < stopThreshold && Math.abs(vY) < stopThreshold) {
                this.inertiaRAF = null;
                return;
            }
            if (++frames > maxFrames) {
                this.inertiaRAF = null;
                return;
            }

            const nextX = this.clamp(
                this.rotation.x - vY / 200,
                -this.config.maxVerticalRotationDeg,
                this.config.maxVerticalRotationDeg
            );
            const nextY = this.wrapAngleSigned(this.rotation.y + vX / 200);

            this.rotation = { x: nextX, y: nextY };
            this.applyTransform(nextX, nextY);

            this.inertiaRAF = requestAnimationFrame(step);
        };

        this.stopInertia();
        this.inertiaRAF = requestAnimationFrame(step);
    }

    // --- Viewer / Lightbox ---
    onTileClick(e) {
        if (this.isDragging || this.hasMoved) return;
        if (performance.now() - this.lastDragEndAt < 80) return;
        if (this.isOpening) return;
        this.openItem(e.currentTarget);
    }

    onTilePointerUp(e) {
        if (e.pointerType !== 'touch') return;
        this.onTileClick(e); // Logic is same
    }

    computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, segments) {
        const unit = 360 / segments / 2;
        const rotateY = unit * (offsetX + (sizeX - 1) / 2);
        const rotateX = unit * (offsetY - (sizeY - 1) / 2);
        return { rotateX, rotateY };
    }

    lockScroll() {
        if (this.scrollLocked) return;
        this.scrollLocked = true;
        document.body.classList.add('dg-scroll-lock');
    }

    unlockScroll() {
        if (!this.scrollLocked) return;
        if (this.container.getAttribute('data-enlarging') === 'true') return;
        this.scrollLocked = false;
        document.body.classList.remove('dg-scroll-lock');
    }

    openItem(el) {
        if (this.isOpening) return;
        this.isOpening = true;
        this.openStartedAt = performance.now();
        this.lockScroll();

        const parent = el.parentElement;
        this.focusedEl = el;
        el.setAttribute('data-focused', 'true');

        const offsetX = parseFloat(parent.dataset.offsetX);
        const offsetY = parseFloat(parent.dataset.offsetY);
        const sizeX = parseFloat(parent.dataset.sizeX);
        const sizeY = parseFloat(parent.dataset.sizeY);

        const parentRot = this.computeItemBaseRotation(offsetX, offsetY, sizeX, sizeY, this.config.segments);
        const parentY = this.normalizeAngle(parentRot.rotateY);
        const globalY = this.normalizeAngle(this.rotation.y);

        let rotY = -(parentY + globalY) % 360;
        if (rotY < -180) rotY += 360;
        const rotX = -parentRot.rotateX - this.rotation.x;

        // Apply counter rotation to parent to face camera
        parent.style.setProperty('--rot-y-delta', `${rotY}deg`);
        parent.style.setProperty('--rot-x-delta', `${rotX}deg`);

        // Create reference placeholder
        const refDiv = document.createElement('div');
        refDiv.className = 'item__image item__image--reference';
        refDiv.style.opacity = '0';
        refDiv.style.transform = `rotateX(${-parentRot.rotateX}deg) rotateY(${-parentRot.rotateY}deg)`;
        parent.appendChild(refDiv);

        // Force layout
        void refDiv.offsetHeight;

        const tileR = refDiv.getBoundingClientRect();
        const mainR = this.mainRef.getBoundingClientRect();
        const frameR = this.frameRef.getBoundingClientRect();

        this.originalTilePos = { left: tileR.left, top: tileR.top, width: tileR.width, height: tileR.height };

        el.style.visibility = 'hidden';
        el.style.zIndex = 0;

        const overlay = document.createElement('div');
        overlay.className = 'enlarge';
        overlay.style.position = 'absolute';
        overlay.style.left = frameR.left - mainR.left + 'px';
        overlay.style.top = frameR.top - mainR.top + 'px';
        overlay.style.width = frameR.width + 'px';
        overlay.style.height = frameR.height + 'px';
        overlay.style.opacity = '0';
        overlay.style.zIndex = '30';
        overlay.style.willChange = 'transform, opacity';
        overlay.style.transformOrigin = 'top left';
        overlay.style.transition = `transform ${this.config.enlargeTransitionMs}ms ease, opacity ${this.config.enlargeTransitionMs}ms ease`;

        const rawSrc = parent.dataset.src || '';
        const img = document.createElement('img');
        img.src = rawSrc;
        overlay.appendChild(img);
        this.viewerRef.appendChild(overlay);

        const tx0 = tileR.left - frameR.left;
        const ty0 = tileR.top - frameR.top;
        const sx0 = tileR.width / frameR.width;
        const sy0 = tileR.height / frameR.height;
        const validSx0 = isFinite(sx0) && sx0 > 0 ? sx0 : 1;
        const validSy0 = isFinite(sy0) && sy0 > 0 ? sy0 : 1;

        overlay.style.transform = `translate(${tx0}px, ${ty0}px) scale(${validSx0}, ${validSy0})`;

        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
            overlay.style.transform = 'translate(0px, 0px) scale(1, 1)';
            this.container.setAttribute('data-enlarging', 'true');
        });

        // Handle custom resize (optional feature from source)
        const transitionEndHandler = (e) => {
            if (e.propertyName !== 'transform') return;
            overlay.removeEventListener('transitionend', transitionEndHandler);

            // If we wanted to animate to a custom size after full expansion, we'd do it here.
            // For now, staying with frame size is simpler and robust.
            this.isOpening = false;
        };
        overlay.addEventListener('transitionend', transitionEndHandler);
    }

    closeViewer() {
        if (performance.now() - this.openStartedAt < 250) return;
        const el = this.focusedEl;
        if (!el) return;

        const parent = el.parentElement;
        const overlay = this.viewerRef.querySelector('.enlarge');
        if (!overlay) return;

        const refDiv = parent.querySelector('.item__image--reference');

        // Calculate reset
        const currentRect = overlay.getBoundingClientRect();
        const rootRect = this.container.getBoundingClientRect();
        const originalPos = this.originalTilePos;

        if (!originalPos) {
            // Fallback close
            overlay.remove();
            this.resetFocusState(el, parent, refDiv);
            return;
        }

        // Animate back
        const originalPosRel = {
            left: originalPos.left - rootRect.left,
            top: originalPos.top - rootRect.top,
            width: originalPos.width,
            height: originalPos.height
        };
        const overlayRel = {
            left: currentRect.left - rootRect.left,
            top: currentRect.top - rootRect.top,
            width: currentRect.width,
            height: currentRect.height
        };

        const closingOverlay = document.createElement('div');
        closingOverlay.className = 'enlarge-closing';
        closingOverlay.style.cssText = `position:absolute;left:${overlayRel.left}px;top:${overlayRel.top}px;width:${overlayRel.width}px;height:${overlayRel.height}px;z-index:9999;border-radius: var(--enlarge-radius, 32px);overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,.35);transition:all ${this.config.enlargeTransitionMs}ms ease-out;pointer-events:none;margin:0;transform:none;`;

        const originalImg = overlay.querySelector('img');
        if (originalImg) {
            const img = originalImg.cloneNode();
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            closingOverlay.appendChild(img);
        }
        overlay.remove();
        this.container.appendChild(closingOverlay);

        requestAnimationFrame(() => {
            closingOverlay.style.left = originalPosRel.left + 'px';
            closingOverlay.style.top = originalPosRel.top + 'px';
            closingOverlay.style.width = originalPosRel.width + 'px';
            closingOverlay.style.height = originalPosRel.height + 'px';
            closingOverlay.style.opacity = '0';
        });

        closingOverlay.addEventListener('transitionend', () => {
            closingOverlay.remove();
            this.resetFocusState(el, parent, refDiv);
        }, { once: true });
    }

    resetFocusState(el, parent, refDiv) {
        this.originalTilePos = null;
        if (refDiv) refDiv.remove();

        parent.style.setProperty('--rot-y-delta', '0deg');
        parent.style.setProperty('--rot-x-delta', '0deg');

        el.style.visibility = '';
        el.style.zIndex = 0;

        this.focusedEl = null;
        this.container.removeAttribute('data-enlarging');
        this.isOpening = false;
        this.unlockScroll();
    }
}
