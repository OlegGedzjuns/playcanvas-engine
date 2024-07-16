import * as pc from 'playcanvas';
import { deviceType, rootPath } from 'examples/utils';

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('application-canvas'));
window.focus();

const gfxOptions = {
    deviceTypes: [deviceType],
    glslangUrl: rootPath + '/static/lib/glslang/glslang.js',
    twgslUrl: rootPath + '/static/lib/twgsl/twgsl.js'
};

const device = await pc.createGraphicsDevice(canvas, gfxOptions);
device.maxPixelRatio = Math.min(window.devicePixelRatio, 2);

const createOptions = new pc.AppOptions();
createOptions.graphicsDevice = device;
createOptions.mouse = new pc.Mouse(document.body);
createOptions.keyboard = new pc.Keyboard(window);

createOptions.componentSystems = [
    pc.RenderComponentSystem,
    pc.CameraComponentSystem,
    pc.LightComponentSystem,
    pc.ScriptComponentSystem
];
createOptions.resourceHandlers = [pc.TextureHandler, pc.ContainerHandler, pc.ScriptHandler, pc.FontHandler];

const app = new pc.AppBase(canvas);
app.init(createOptions);

// set the canvas to fill the window and automatically change resolution to be the same as the canvas size
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

// load assets
const assets = {
    script: new pc.Asset('script', 'script', { url: rootPath + '/static/scripts/camera/orbit-camera.js' }),
    font: new pc.Asset('font', 'font', { url: rootPath + '/static/assets/fonts/courier.json' })
};
/**
 * @param {pc.Asset[] | number[]} assetList - The asset list.
 * @param {pc.AssetRegistry} assetRegistry - The asset registry.
 * @returns {Promise<void>} The promise.
 */
function loadAssets(assetList, assetRegistry) {
    return new Promise((resolve) => {
        const assetListLoader = new pc.AssetListLoader(assetList, assetRegistry);
        assetListLoader.load(resolve);
    });
}
await loadAssets(Object.values(assets), app.assets);

app.start();
/**
 * @param {pc.Color} color - The color.
 * @returns {pc.Material} - The standard material.
 */
function createColorMaterial(color) {
    const material = new pc.StandardMaterial();
    material.diffuse = color;
    material.update();
    return material;
}

// scene settings
app.scene.ambientLight = new pc.Color(0.2, 0.2, 0.2);

// create entities
const box = new pc.Entity('box');
box.addComponent('render', {
    type: 'box',
    material: createColorMaterial(new pc.Color(0.8, 0.8, 0.8))
});
app.root.addChild(box);

// create camera entity
const camera = new pc.Entity('camera');
camera.addComponent('camera', {
    clearColor: new pc.Color(0.1, 0.1, 0.1),
    farClip: 1000
});
camera.addComponent('script');
const orbitCamera = camera.script.create('orbitCamera');
camera.script.create('orbitCameraInputMouse');
camera.script.create('orbitCameraInputTouch');
camera.setPosition(1, 1, 1);
app.root.addChild(camera);
orbitCamera.distance = 5 * camera.camera?.aspectRatio;

// create light entity
const light = new pc.Entity('light');
light.addComponent('light', {
    intensity: 1
});
app.root.addChild(light);
light.setEulerAngles(0, 0, -60);

// create layers
const gizmoLayer = new pc.Layer({
    name: 'Gizmo',
    clearDepthBuffer: true,
    opaqueSortMode: pc.SORTMODE_NONE,
    transparentSortMode: pc.SORTMODE_NONE
});
const layers = app.scene.layers;
layers.push(gizmoLayer);
camera.camera.layers = camera.camera.layers.concat(gizmoLayer.id);

// create gizmo
const gizmo = new pc.TranslateGizmo(app, camera.camera, gizmoLayer);
gizmo.attach([box]);

// ensure canvas is resized when window changes size + keep gizmo size consistent to canvas size
const resize = () => {
    app.resizeCanvas();
    const bounds = canvas.getBoundingClientRect();
    const dim = camera.camera.horizontalFov ? bounds.width : bounds.height;
    gizmo.size = 1024 / dim;
};
window.addEventListener('resize', resize);
resize();

// grid lines
const createGridLines = (size = 1) => {
    /**
     * @type {{ start: pc.Vec3; end: pc.Vec3; }[]}
     */
    const lines = [];
    for (let i = -size; i < size + 1; i++) {
        lines.push({
            start: new pc.Vec3(-size, 0, i),
            end: new pc.Vec3(size, 0, i)
        });
        lines.push({
            start: new pc.Vec3(i, 0, -size),
            end: new pc.Vec3(i, 0, size)
        });
    }

    return lines;
};

const lines = createGridLines(2);
const gridColor = new pc.Color(1, 1, 1, 0.5);
app.on('update', () => {
    for (const line of lines) {
        app.drawLine(line.start, line.end, gridColor);
    }
});

app.on('destroy', () => {
    window.removeEventListener('resize', resize);
});

export { app };
