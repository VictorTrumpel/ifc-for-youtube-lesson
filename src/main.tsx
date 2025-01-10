import "./index.css";
import * as THREE from "three";
import * as WEBIFC from "web-ifc";
import * as OBC from "@thatopen/components";
import * as OBCF from "@thatopen/components-front";
import { ThreeMFLoader } from "three/addons/loaders/3MFLoader.js";

// download ifc from https://www.steptools.com/docs/stpfiles/ifc/

(async () => {
  const container = document.getElementById("container")!;
  const components = new OBC.Components();
  const worlds = components.get(OBC.Worlds);
  const world = worlds.create<
    OBC.SimpleScene,
    OBC.SimpleCamera,
    OBC.SimpleRenderer
  >();

  const fragmentIfcLoader = components.get(OBC.IfcLoader);
  await fragmentIfcLoader.setup();

  world.scene = new OBC.SimpleScene(components);
  world.renderer = new OBC.SimpleRenderer(components, container);
  world.camera = new OBC.SimpleCamera(components);

  const grids = components.get(OBC.Grids);
  grids.create(world);
  const casters = components.get(OBC.Raycasters);
  casters.get(world);
  const clipper = components.get(OBC.Clipper);
  clipper.enabled = true;

  components.init();
  world.scene.setup();

  const model = await loadIfc();

  const classifier = components.get(OBC.Classifier);
  classifier.byEntity(model);
  classifier.byIfcRel(
    model,
    WEBIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE,
    "storeys"
  );
  classifier.byModel(model.uuid, model);
  const walls = classifier.find({
    entities: ["IFCWALLSTANDARDCASE"],
  });
  const doors = classifier.find({
    entities: ["IFCDOOR"],
  });
  classifier.setColor(doors, new THREE.Color("yellow"));

  const highlighter = components.get(OBCF.Highlighter);
  highlighter.setup({ world });
  highlighter.zoomToSelection = true;
  highlighter.events.select.onHighlight.add((data) => {
    console.log("data :>> ", data);
  });

  const manager = new THREE.LoadingManager();
  const loader = new ThreeMFLoader(manager);
  loader.load("/truck.3mf", function (object) {
    object.rotation.set(-Math.PI / 2, 0, 0); // z-up conversion

    object.traverse(function (child) {
      child.castShadow = true;
    });

    world.scene.three.add(object);

    object.position.set(27, -10, 2);
  });

  // window.onkeydown = (event) => {
  //   if (event.code === "Backspace") {
  //     clipper.delete(world);
  //   }
  // };

  async function loadIfc() {
    const file = await fetch("/house.ifc");
    const data = await file.arrayBuffer();
    const buffer = new Uint8Array(data);
    const model = await fragmentIfcLoader.load(buffer);
    world.scene.three.add(model);
    world.meshes.add(model);
    return model;
  }
})();
