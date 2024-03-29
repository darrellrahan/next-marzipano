"use client";

import React, { useEffect, useRef } from "react";
import { data } from "../data";

function Place() {
  const panoRef = useRef(null);

  useEffect(() => {
    var setMode = function () {
      if (mql.matches) {
        document.body.classList.remove("desktop");
        document.body.classList.add("mobile");
      } else {
        document.body.classList.remove("mobile");
        document.body.classList.add("desktop");
      }
    };
    var mql = matchMedia("(max-width: 500px), (max-height: 500px)");
    setMode();
    mql.addListener(setMode);

    // Detect whether we are on a touch device.
    document.body.classList.add("no-touch");
    window.addEventListener("touchstart", function () {
      document.body.classList.remove("no-touch");
      document.body.classList.add("touch");
    });

    // Viewer options.
    var viewerOpts = {
      controls: {
        mouseViewMode: data.settings.mouseViewMode,
      },
    };

    const Marzipano = require("marzipano");

    // Initialize viewer.
    var viewer = new Marzipano.Viewer(panoRef.current, viewerOpts);

    // Create scenes.
    var scenes = data.scenes.map(function (data) {
      var urlPrefix = "tiles";
      var source = Marzipano.ImageUrlSource.fromString(
        urlPrefix + "/" + data.id + "/{z}/{f}/{y}/{x}.jpg",
        { cubeMapPreviewUrl: urlPrefix + "/" + data.id + "/preview.jpg" }
      );
      var geometry = new Marzipano.CubeGeometry(data.levels);

      var limiter = Marzipano.RectilinearView.limit.traditional(
        data.faceSize,
        (100 * Math.PI) / 180,
        (120 * Math.PI) / 180
      );
      var view = new Marzipano.RectilinearView(
        data.initialViewParameters,
        limiter
      );

      var scene = viewer.createScene({
        source: source,
        geometry: geometry,
        view: view,
        pinFirstLevel: true,
      });

      // Create link hotspots.
      data.linkHotspots.forEach(function (hotspot) {
        var element = createLinkHotspotElement(hotspot);
        scene
          .hotspotContainer()
          .createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
      });

      // Create info hotspots.
      data.infoHotspots.forEach(function (hotspot) {
        var element = createInfoHotspotElement(hotspot);
        scene
          .hotspotContainer()
          .createHotspot(element, { yaw: hotspot.yaw, pitch: hotspot.pitch });
      });

      return {
        data: data,
        scene: scene,
        view: view,
      };
    });

    var autorotate = Marzipano.autorotate({
      yawSpeed: 0.03,
      targetPitch: 0,
      targetFov: Math.PI / 2,
    });

    viewer.startMovement(autorotate);
    viewer.setIdleMovement(3000, autorotate);

    function switchScene(scene: any) {
      scene.view.setParameters(scene.data.initialViewParameters);
      scene.scene.switchTo();
    }

    function createLinkHotspotElement(hotspot: any) {
      // Create wrapper element to hold icon and tooltip.
      var wrapper = document.createElement("div");
      wrapper.classList.add("hotspot");
      wrapper.classList.add("link-hotspot");

      // Create image element.
      var icon = document.createElement("img");
      icon.src = "/img/link.png";
      icon.classList.add("link-hotspot-icon");

      // Set rotation transform.
      var transformProperties = [
        "-ms-transform",
        "-webkit-transform",
        "transform",
      ];
      for (var i = 0; i < transformProperties.length; i++) {
        var property: any = transformProperties[i];
        icon.style[property] = "rotate(" + hotspot.rotation + "rad)";
      }

      // Add click event handler.
      wrapper.addEventListener("click", function () {
        switchScene(findSceneById(hotspot.target));
      });

      // Prevent touch and scroll events from reaching the parent element.
      // This prevents the view control logic from interfering with the hotspot.
      stopTouchAndScrollEventPropagation(wrapper);

      // Create tooltip element.
      var tooltip = document.createElement("div");
      tooltip.classList.add("hotspot-tooltip");
      tooltip.classList.add("link-hotspot-tooltip");
      tooltip.innerHTML = findSceneDataById(hotspot.target)!.name;

      wrapper.appendChild(icon);
      wrapper.appendChild(tooltip);

      return wrapper;
    }

    function createInfoHotspotElement(hotspot: any) {
      // Create wrapper element to hold icon and tooltip.
      var wrapper = document.createElement("div");
      wrapper.classList.add("hotspot");
      wrapper.classList.add("info-hotspot");

      // Create hotspot/tooltip header.
      var header = document.createElement("div");
      header.classList.add("info-hotspot-header");

      // Create image element.
      var iconWrapper = document.createElement("div");
      iconWrapper.classList.add("info-hotspot-icon-wrapper");
      var icon = document.createElement("img");
      icon.src = "img/info.png";
      icon.classList.add("info-hotspot-icon");
      iconWrapper.appendChild(icon);

      // Create title element.
      var titleWrapper = document.createElement("div");
      titleWrapper.classList.add("info-hotspot-title-wrapper");
      var title = document.createElement("div");
      title.classList.add("info-hotspot-title");
      title.innerHTML = hotspot.title;
      titleWrapper.appendChild(title);

      // Create close element.
      var closeWrapper = document.createElement("div");
      closeWrapper.classList.add("info-hotspot-close-wrapper");
      var closeIcon = document.createElement("img");
      closeIcon.src = "img/close.png";
      closeIcon.classList.add("info-hotspot-close-icon");
      closeWrapper.appendChild(closeIcon);

      // Construct header element.
      header.appendChild(iconWrapper);
      header.appendChild(titleWrapper);
      header.appendChild(closeWrapper);

      // Create text element.
      var text = document.createElement("div");
      text.classList.add("info-hotspot-text");
      text.innerHTML = hotspot.text;

      // Place header and text into wrapper element.
      wrapper.appendChild(header);
      wrapper.appendChild(text);

      // Create a modal for the hotspot content to appear on mobile mode.
      var modal = document.createElement("div");
      modal.innerHTML = wrapper.innerHTML;
      modal.classList.add("info-hotspot-modal");
      document.body.appendChild(modal);

      var toggle = function () {
        wrapper.classList.toggle("visible");
        modal.classList.toggle("visible");
      };

      // Show content when hotspot is clicked.
      wrapper
        .querySelector(".info-hotspot-header")!
        .addEventListener("click", toggle);

      // Hide content when close icon is clicked.
      modal
        .querySelector(".info-hotspot-close-wrapper")!
        .addEventListener("click", toggle);

      // Prevent touch and scroll events from reaching the parent element.
      // This prevents the view control logic from interfering with the hotspot.
      stopTouchAndScrollEventPropagation(wrapper);

      return wrapper;
    }

    // Prevent touch and scroll events from reaching the parent element.
    function stopTouchAndScrollEventPropagation(element: any) {
      var eventList = [
        "touchstart",
        "touchmove",
        "touchend",
        "touchcancel",
        "wheel",
        "mousewheel",
      ];
      for (var i = 0; i < eventList.length; i++) {
        element.addEventListener(eventList[i], function (event: any) {
          event.stopPropagation();
        });
      }
    }

    function findSceneById(id: any) {
      for (var i = 0; i < scenes.length; i++) {
        if (scenes[i].data.id === id) {
          return scenes[i];
        }
      }
      return null;
    }

    function findSceneDataById(id: any) {
      for (var i = 0; i < data.scenes.length; i++) {
        if (data.scenes[i].id === id) {
          return data.scenes[i];
        }
      }
      return null;
    }

    // Display the initial scene.
    switchScene(scenes[0]);
  }, []);

  return <div className="h-full w-full absolute" ref={panoRef}></div>;
}

export default Place;
