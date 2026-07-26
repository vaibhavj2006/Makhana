/*
  makhana-flock.js
  --------------------------------------------------------------
  A lightweight "boids" flocking background effect — like Vanta's
  BIRDS effect, but with round puffy makhana (fox nut) particles
  instead of birds. Built plain, no build step, so it's easy to
  read and tweak.

  Requires: three.js already loaded on the page (r128+), e.g.
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>

  Usage:
    <div id="hero-flock" style="position:relative; height:70vh;"></div>
    <script src="makhana-flock.js"></script>
    <script>
      const flock = MAKHANA.FLOCK({
        el: '#hero-flock',
        quantity: 24,          // number of makhana puffs
        color: 0xf5e6c8,       // cream/tan makhana color
        backgroundColor: null, // null = transparent background
        speed: 1,
        separation: 20,
        alignment: 20,
        cohesion: 20
      });

      // later, if needed:
      // flock.destroy();
    </script>
*/
(function () {
  "use strict";

  if (typeof window === "undefined") return;
  window.MAKHANA = window.MAKHANA || {};

  function isMobile() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ) || window.innerWidth < 600
    );
  }

  // A single flocking "boid" — plain position/velocity + steering rules.
  class Boid {
    constructor(opts) {
      this.position = new THREE.Vector3(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0.5) * 200,
        (Math.random() - 0.5) * 200
      );
      this.velocity = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      );
      this.acceleration = new THREE.Vector3();
      this.opts = opts;
      this.worldSize = { x: 300, y: 200, z: 150 };
      this.maxSpeed = 2.2;
    }

    edgeAvoidForce(target) {
      const away = new THREE.Vector3().copy(this.position).sub(target);
      const distSq = Math.max(this.position.distanceToSquared(target), 1);
      return away.multiplyScalar(1 / distSq);
    }

    run(flock) {
      const { x, y, z } = this.worldSize;
      const p = this.position;
      const bounds = [
        new THREE.Vector3(-x, p.y, p.z),
        new THREE.Vector3(x, p.y, p.z),
        new THREE.Vector3(p.x, -y, p.z),
        new THREE.Vector3(p.x, y, p.z),
        new THREE.Vector3(p.x, p.y, -z),
        new THREE.Vector3(p.x, p.y, z),
      ];
      bounds.forEach((b) => {
        this.acceleration.add(this.edgeAvoidForce(b).multiplyScalar(5));
      });

      if (Math.random() > 0.5) this.flockWith(flock);
      this.move();
    }

    flockWith(flock) {
      this.acceleration.add(this.alignment(flock));
      this.acceleration.add(this.cohesion(flock));
      this.acceleration.add(this.separation(flock));
      if (this.repelPoint) {
        const away = new THREE.Vector3().copy(this.position).sub(this.repelPoint);
        const d = away.length();
        if (d < 150) away.normalize().multiplyScalar(0.5 / d), this.acceleration.add(away);
      }
    }

    move() {
      this.velocity.add(this.acceleration);
      const speed = this.velocity.length();
      if (speed > this.maxSpeed) this.velocity.divideScalar(speed / this.maxSpeed);
      this.position.add(this.velocity);
      this.acceleration.set(0, 0, 0);
    }

    alignment(flock) {
      const range = (100 * this.opts.alignment) / 20;
      const sum = new THREE.Vector3();
      let count = 0;
      flock.forEach((other) => {
        if (other === this || Math.random() > 0.6) return;
        const d = other.position.distanceTo(this.position);
        if (d > 0 && d <= range) {
          sum.add(other.velocity);
          count++;
        }
      });
      if (count > 0) {
        sum.divideScalar(count);
        if (sum.length() > 0.1) sum.setLength(Math.min(sum.length(), 0.1));
      }
      return sum;
    }

    cohesion(flock) {
      const range = (100 * this.opts.cohesion) / 20;
      const center = new THREE.Vector3();
      let count = 0;
      flock.forEach((other) => {
        if (other === this || Math.random() > 0.6) return;
        const d = other.position.distanceTo(this.position);
        if (d > 0 && d <= range) {
          center.add(other.position);
          count++;
        }
      });
      const steer = new THREE.Vector3();
      if (count > 0) {
        center.divideScalar(count);
        steer.subVectors(center, this.position);
        if (steer.length() > 0.1) steer.setLength(0.1);
      }
      return steer;
    }

    separation(flock) {
      const range = (100 * this.opts.separation) / 20;
      const steer = new THREE.Vector3();
      flock.forEach((other) => {
        if (other === this || Math.random() > 0.6) return;
        const d = other.position.distanceTo(this.position);
        if (d > 0 && d <= range) {
          const away = new THREE.Vector3()
            .subVectors(this.position, other.position)
            .normalize()
            .divideScalar(d);
          steer.add(away);
        }
      });
      return steer;
    }
  }

  // Builds one puffy "makhana" mesh — a slightly irregular cream sphere.
  function makeMakhanaMesh(color) {
    const geo = new THREE.SphereGeometry(4, 10, 8);
    // Nudge vertices a little so puffs look organic, not perfectly round.
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const jitter = 1 + (Math.random() - 0.5) * 0.15;
      pos.setXYZ(i, pos.getX(i) * jitter, pos.getY(i) * jitter, pos.getZ(i) * jitter);
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.85,
      metalness: 0.05,
    });
    return new THREE.Mesh(geo, mat);
  }

  class MakhanaFlock {
    constructor(options = {}) {
      this.options = Object.assign(
        {
          el: null,
          quantity: 20,
          color: 0xf5e6c8,
          backgroundColor: null,
          speed: 1,
          separation: 20,
          alignment: 20,
          cohesion: 20,
          mouseControls: true,
        },
        options
      );

      this.el =
        typeof this.options.el === "string"
          ? document.querySelector(this.options.el)
          : this.options.el;
      if (!this.el) {
        console.error("[MAKHANA.FLOCK] no el found for", options.el);
        return;
      }
      if (typeof THREE === "undefined") {
        console.error("[MAKHANA.FLOCK] three.js is not loaded on this page");
        return;
      }

      this._resizeBound = this._resize.bind(this);
      this._mouseBound = this._onMouseMove.bind(this);
      this._loopBound = this._loop.bind(this);

      this._init();
    }

    _init() {
      const el = this.el;
      if (getComputedStyle(el).position === "static") el.style.position = "relative";

      this.width = el.offsetWidth || 600;
      this.height = el.offsetHeight || 400;

      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.setSize(this.width, this.height);
      Object.assign(this.renderer.domElement.style, {
        position: "absolute",
        top: 0,
        left: 0,
        zIndex: 0,
      });
      el.appendChild(this.renderer.domElement);

      this.scene = new THREE.Scene();
      if (this.options.backgroundColor != null) {
        this.scene.background = new THREE.Color(this.options.backgroundColor);
      }

      this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 1, 3000);
      this.camera.position.set(0, 0, 500);

      this.scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const light = new THREE.DirectionalLight(0xffffff, 0.6);
      light.position.set(100, 200, 300);
      this.scene.add(light);

      const count = isMobile() ? Math.round(this.options.quantity * 0.6) : this.options.quantity;
      this.boids = [];
      this.meshes = [];
      for (let i = 0; i < count; i++) {
        const boid = new Boid(this.options);
        const mesh = makeMakhanaMesh(this.options.color);
        mesh.position.copy(boid.position);
        this.scene.add(mesh);
        this.boids.push(boid);
        this.meshes.push(mesh);
      }

      window.addEventListener("resize", this._resizeBound);
      if (this.options.mouseControls) {
        el.addEventListener("mousemove", this._mouseBound);
      }

      this._loop();
    }

    _resize() {
      this.width = this.el.offsetWidth;
      this.height = this.el.offsetHeight;
      this.camera.aspect = this.width / this.height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.width, this.height);
    }

    _onMouseMove(e) {
      const rect = this.el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = -(e.clientY - rect.top - rect.height / 2);
      const repel = new THREE.Vector3(x, y, 0);
      this.boids.forEach((b) => (b.repelPoint = repel));
    }

    _loop() {
      this._raf = requestAnimationFrame(this._loopBound);
      this.boids.forEach((boid, i) => {
        boid.run(this.boids);
        const mesh = this.meshes[i];
        mesh.position.copy(boid.position);
        // gentle tumble so puffs don't look static
        mesh.rotation.x += 0.003 * this.options.speed;
        mesh.rotation.y += 0.004 * this.options.speed;
      });
      this.renderer.render(this.scene, this.camera);
    }

    setOptions(opts) {
      Object.assign(this.options, opts);
    }

    destroy() {
      cancelAnimationFrame(this._raf);
      window.removeEventListener("resize", this._resizeBound);
      this.el.removeEventListener("mousemove", this._mouseBound);
      this.meshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      if (this.renderer) {
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
          this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
      }
    }
  }

  window.MAKHANA.FLOCK = function (options) {
    return new MakhanaFlock(options);
  };
})();
