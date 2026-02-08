class AntigravityAnimation {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Antigravity: Container #${containerId} not found`);
            return;
        }

        this.options = {
            count: 300,
            magnetRadius: 10,
            ringRadius: 10,
            waveSpeed: 0.4,
            waveAmplitude: 1,
            particleSize: 1, // Reset to 1 as base, scale up in loop
            lerpSpeed: 0.1,
            color: '#FF9FFC',
            autoAnimate: false,
            particleVariance: 1,
            rotationSpeed: 0,
            depthFactor: 1,
            pulseSpeed: 3,
            fieldStrength: 10,
            ...options
        };

        this.init();
    }

    init() {
        this.scene = new THREE.Scene();

        // Ensure container has dimensions
        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 1000);
        this.camera.position.set(0, 0, 50);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.dummy = new THREE.Object3D();
        this.lastMousePos = { x: 0, y: 0 };
        this.virtualMouse = { x: 0, y: 0 };
        this.mouse = new THREE.Vector2(0, 0);
        this.clock = new THREE.Clock();
        this.lastMouseMoveTime = 0;

        this.createParticles();
        this.addEventListeners();

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        // Force initial resize check
        this.onWindowResize();
    }

    createHeartShape() {
        const x = 0, y = 0;
        const shape = new THREE.Shape();
        // Standard heart shape logic
        shape.moveTo(x + 5, y + 5);
        shape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y);
        shape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7);
        shape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19);
        shape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7);
        shape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y);
        shape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5);
        return shape;
    }

    createParticles() {
        const heartShape = this.createHeartShape();
        const geometry = new THREE.ShapeGeometry(heartShape);

        // Scale down geometry initially because the standard shape is large (approx 20 units)
        geometry.scale(0.1, 0.1, 0.1);

        // Center the geometry
        geometry.computeBoundingBox();
        const xMid = -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);
        const yMid = -0.5 * (geometry.boundingBox.max.y - geometry.boundingBox.min.y);
        geometry.translate(xMid, yMid, 0);

        // DoubleSide ensures visibility from both sides if rotated
        const material = new THREE.MeshBasicMaterial({
            color: this.options.color,
            side: THREE.DoubleSide
        });

        this.mesh = new THREE.InstancedMesh(geometry, material, this.options.count);

        this.particles = [];
        const width = 100; // World width
        const height = 100; // World height

        for (let i = 0; i < this.options.count; i++) {
            const t = Math.random() * 100;
            const factor = 20 + Math.random() * 100;
            const speed = 0.01 + Math.random() / 200;

            const x = (Math.random() - 0.5) * width;
            const y = (Math.random() - 0.5) * height;
            const z = (Math.random() - 0.5) * 20;

            const randomRadiusOffset = (Math.random() - 0.5) * 2;

            this.particles.push({
                t, factor, speed,
                mx: x, my: y, mz: z,
                cx: x, cy: y, cz: z,
                randomRadiusOffset
            });
        }

        this.scene.add(this.mesh);
    }

    addEventListeners() {
        window.addEventListener('mousemove', (e) => {
            const newX = (e.clientX / window.innerWidth) * 2 - 1;
            const newY = -(e.clientY / window.innerHeight) * 2 + 1;

            const dx = newX - this.lastMousePos.x;
            const dy = newY - this.lastMousePos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            this.mouse.set(newX, newY);

            if (dist > 0.001) {
                this.lastMouseMoveTime = Date.now();
                this.lastMousePos = { x: newX, y: newY };
            }
        });

        window.addEventListener('resize', () => this.onWindowResize());
    }

    onWindowResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        if (!this.container) return;
        requestAnimationFrame(this.animate);

        const time = this.clock.getElapsedTime();

        const vHeight = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
        const vWidth = vHeight * this.camera.aspect;

        let destX = (this.mouse.x * vWidth) / 2;
        let destY = (this.mouse.y * vHeight) / 2;

        if (this.options.autoAnimate && Date.now() - this.lastMouseMoveTime > 2000) {
            destX = Math.sin(time * 0.5) * (vWidth / 4);
            destY = Math.cos(time * 0.5 * 2) * (vHeight / 4);
        }

        const smoothFactor = 0.05;
        this.virtualMouse.x += (destX - this.virtualMouse.x) * smoothFactor;
        this.virtualMouse.y += (destY - this.virtualMouse.y) * smoothFactor;

        const globalRotation = time * this.options.rotationSpeed;

        for (let i = 0; i < this.options.count; i++) {
            const particle = this.particles[i];

            particle.t += particle.speed / 2;

            const projectionFactor = 1 - particle.cz / 50;
            const projectedTargetX = this.virtualMouse.x * projectionFactor;
            const projectedTargetY = this.virtualMouse.y * projectionFactor;

            const dx = particle.mx - projectedTargetX;
            const dy = particle.my - projectedTargetY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            let targetPos = { x: particle.mx, y: particle.my, z: particle.mz * this.options.depthFactor };

            if (dist < this.options.magnetRadius) {
                const angle = Math.atan2(dy, dx) + globalRotation;

                const wave = Math.sin(particle.t * this.options.waveSpeed + angle) * (0.5 * this.options.waveAmplitude);
                const deviation = particle.randomRadiusOffset * (5 / (this.options.fieldStrength + 0.1));
                const currentRingRadius = this.options.ringRadius + wave + deviation;

                targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
                targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
                targetPos.z = particle.mz * this.options.depthFactor + Math.sin(particle.t) * (1 * this.options.waveAmplitude * this.options.depthFactor);
            }

            particle.cx += (targetPos.x - particle.cx) * this.options.lerpSpeed;
            particle.cy += (targetPos.y - particle.cy) * this.options.lerpSpeed;
            particle.cz += (targetPos.z - particle.cz) * this.options.lerpSpeed;

            this.dummy.position.set(particle.cx, particle.cy, particle.cz);

            this.dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);

            // Reintroduce rotation logic.
            // Original code: rotateX(Math.PI / 2). But that was for Capsule (Y-up).
            // ShapeGeometry (XY plane).
            // If we want it to face the mouse, `lookAt` does that (Z towards mouse).
            // But we want the Heart (flat surface) to be visible.
            // If the surface normal is Z, and Z points to mouse, then the heart fully faces the mouse.
            // HOWEVER, if we want it to "float" around like petals, we might want random rotation.
            // But let's stick to the "magnetic" alignment.
            // Let's add a spin based on time? No.

            // KEY Fix: The heart geometry is roughly oriented "top up" in Y.
            // When `lookAt` runs, the object's Y axis points "up" relative to the look vector.
            // If we don't change anything, "up" is usually (0,1,0).
            // If the heart is facing the mouse, it should look okay.

            // Wait, ShapeGeometry is created on XY plane.
            // Z is protruding out.
            // lookAt assumes local -Z points to target in some engines, but Three.js: +Z points to target?
            // "The .lookAt() method rotates the object so that its local positive z-axis faces the target point."
            // Our Heart is on XY plane. Its "face" is towards +Z.
            // So +Z --> faces target.
            // So the heart *faces* the target point. This is correct for visibility.

            // But maybe we want to rotate it so the "top" of the heart points away?
            // That would be rotation around Z.
            // Let's rotate it 180 degrees around Z because the standard shape draws it "up",
            // but `lookAt` with default up vector (0,1,0) keeps Y up.
            // So the heart should be upright.

            // Let's rotate X to make it lie flat relative to the "field lines"?
            // If we uncomment this:
            // this.dummy.rotateX(Math.PI / 2);
            // It rotates around local X. X is horizontal.
            // This would make the heart "stand up" or "lie down" relative to the view vector.
            // Let's keep it simple: facing camera/target is robust. I will NOT rotate X.
            // BUT, I will rotate Z 180 degrees because the drawn shape might be upside down relative to `lookAt` default orientation?
            this.dummy.rotateZ(Math.PI);

            // Calculate scale
            const currentDistToMouse = Math.sqrt(
                Math.pow(particle.cx - projectedTargetX, 2) + Math.pow(particle.cy - projectedTargetY, 2)
            );

            const distFromRing = Math.abs(currentDistToMouse - this.options.ringRadius);
            let scaleFactor = 1 - distFromRing / 10;
            scaleFactor = Math.max(0, Math.min(1, scaleFactor));

            const finalScale = scaleFactor * (0.8 + Math.sin(particle.t * this.options.pulseSpeed) * 0.2 * this.options.particleVariance) * this.options.particleSize;

            this.dummy.scale.set(finalScale, finalScale, finalScale);
            this.dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this.dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
        this.renderer.render(this.scene, this.camera);
    }
}
