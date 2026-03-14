import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import TopBar from './components/TopBar';
import CameraPanel from './components/CameraPanel';
import MapPanel from './components/MapPanel';
import LogPanel from './components/LogPanel';
import TaskPanel from './components/TaskPanel';
import SciencePanel from './components/SciencePanel';
import ROSLIB from 'roslib';

const TAB_LAYOUT = {
  camera: {
    id: 'camera', title: 'Camera', x: 16, y: 16, width: 650, height: 520,
    minWidth: 480, minHeight: 320, maxWidth: 1180, maxHeight: 800
  },
  map: {
    id: 'map', title: 'Map', x: 690, y: 16, width: 430, height: 255,
    minWidth: 320, minHeight: 220, maxWidth: 860, maxHeight: 620
  },
  logs: {
    id: 'logs', title: 'Logs', x: 690, y: 285, width: 430, height: 250,
    minWidth: 340, minHeight: 220, maxWidth: 900, maxHeight: 640
  },
  tasks: {
    id: 'tasks', title: 'Tasks', x: 1136, y: 16, width: 360, height: 520,
    minWidth: 320, minHeight: 300, maxWidth: 680, maxHeight: 860
  }
};

const SNAP_THRESHOLD = 16;
const DOCK_GAP = 10;
const MINIMIZED_WIDTH = 220;
const MINIMIZED_HEIGHT = 44;
const EDGE_DOCK_THRESHOLD = 28;
const THEME_STORAGE_KEY = 'gtu-rover-theme';

function snapAxis(value, candidates, threshold) {
  let best = null;
  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i];
    const distance = Math.abs(value - candidate);
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = { value: candidate, distance };
    }
  }
  return best ? best.value : value;
}

function App() {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === 'light' ? 'light' : 'dark';
  });
  const [rosConnected, setRosConnected] = useState(false);
  const [batteryLevel] = useState(50);
  const [autonomousMode, setAutonomousMode] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [scienceMode, setScienceMode] = useState(false);
  const [tabs, setTabs] = useState(() => ({
    camera: { ...TAB_LAYOUT.camera, visible: true, minimized: false, maximized: false, restoreRect: null, z: 5 },
    map: { ...TAB_LAYOUT.map, visible: true, minimized: false, maximized: false, restoreRect: null, z: 4 },
    logs: { ...TAB_LAYOUT.logs, visible: true, minimized: false, maximized: false, restoreRect: null, z: 3 },
    tasks: { ...TAB_LAYOUT.tasks, visible: true, minimized: false, maximized: false, restoreRect: null, z: 2 }
  }));
  const [activeTab, setActiveTab] = useState('camera');
  const [snapGuide, setSnapGuide] = useState({ x: null, y: null });
  const [draggingTabId, setDraggingTabId] = useState(null);
  const [resizingTabId, setResizingTabId] = useState(null);
  const [dockPreview, setDockPreview] = useState(null);
  const workspaceRef = useRef(null);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);
  const dockHintRef = useRef(null);
  const nextZRef = useRef(6);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const getMaximizedRect = (tab, bounds) => {
    const maxWidth = Math.min(tab.maxWidth, bounds.width);
    const maxHeight = Math.min(tab.maxHeight, bounds.height);
    return {
      x: Math.max(0, (bounds.width - maxWidth) / 2),
      y: Math.max(0, (bounds.height - maxHeight) / 2),
      width: maxWidth,
      height: maxHeight
    };
  };

  const getTabRect = (tab) => ({
    x: tab.x,
    y: tab.y,
    width: tab.minimized ? MINIMIZED_WIDTH : tab.width,
    height: tab.minimized ? MINIMIZED_HEIGHT : tab.height
  });

  const rectsOverlap = (a, b) =>
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y;

  const hasCollision = (candidateRect, tabId, allTabs) =>
    Object.values(allTabs).some((other) => {
      if (!other.visible || other.id === tabId) {
        return false;
      }
      return rectsOverlap(candidateRect, getTabRect(other));
    });

  const findFreePosition = (desiredRect, tabId, allTabs, bounds) => {
    const maxX = Math.max(0, bounds.width - desiredRect.width);
    const maxY = Math.max(0, bounds.height - desiredRect.height);
    const clampX = (x) => Math.min(maxX, Math.max(0, x));
    const clampY = (y) => Math.min(maxY, Math.max(0, y));

    const origin = { x: clampX(desiredRect.x), y: clampY(desiredRect.y) };
    if (!hasCollision({ ...desiredRect, ...origin }, tabId, allTabs)) {
      return origin;
    }

    const step = 14;
    const maxRadius = Math.max(bounds.width, bounds.height);
    for (let radius = step; radius <= maxRadius; radius += step) {
      for (let offset = -radius; offset <= radius; offset += step) {
        const candidates = [
          { x: clampX(origin.x + offset), y: clampY(origin.y - radius) },
          { x: clampX(origin.x + offset), y: clampY(origin.y + radius) },
          { x: clampX(origin.x - radius), y: clampY(origin.y + offset) },
          { x: clampX(origin.x + radius), y: clampY(origin.y + offset) }
        ];

        for (let i = 0; i < candidates.length; i += 1) {
          const point = candidates[i];
          if (!hasCollision({ ...desiredRect, ...point }, tabId, allTabs)) {
            return point;
          }
        }
      }
    }

    return null;
  };

  const fillRegion = (region, tab) => {
    const width = Math.min(tab.maxWidth, region.width);
    const height = Math.min(tab.maxHeight, region.height);
    return {
      x: region.x + Math.max(0, (region.width - width) / 2),
      y: region.y + Math.max(0, (region.height - height) / 2),
      width: Math.max(tab.minWidth, width),
      height: Math.max(tab.minHeight, height)
    };
  };

  const placeTabsInRegion = (ids, region, prevTabs, nextTabs) => {
    if (ids.length === 0) {
      return;
    }
    const gap = 10;
    const cols = Math.ceil(Math.sqrt(ids.length));
    const rows = Math.ceil(ids.length / cols);
    const cellWidth = (region.width - gap * (cols + 1)) / cols;
    const cellHeight = (region.height - gap * (rows + 1)) / rows;

    ids.forEach((id, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const base = prevTabs[id];
      const maxW = Math.max(base.minWidth, Math.min(base.maxWidth, cellWidth));
      const maxH = Math.max(base.minHeight, Math.min(base.maxHeight, cellHeight));
      const x = region.x + gap + col * (cellWidth + gap) + Math.max(0, (cellWidth - maxW) / 2);
      const y = region.y + gap + row * (cellHeight + gap) + Math.max(0, (cellHeight - maxH) / 2);

      nextTabs[id] = {
        ...base,
        minimized: false,
        maximized: false,
        restoreRect: null,
        x,
        y,
        width: maxW,
        height: maxH,
        z: nextZRef.current++
      };
    });
  };

  const applyEdgeDock = (tabId, side) => {
    if (!workspaceRef.current) {
      return;
    }
    const bounds = workspaceRef.current.getBoundingClientRect();
    setTabs((prev) => {
      const next = { ...prev };
      const active = prev[tabId];
      if (!active || !active.visible) {
        return prev;
      }

      const split = Math.floor(bounds.width / 2);
      const leftRegion = { x: 0, y: 0, width: split - 4, height: bounds.height };
      const rightRegion = { x: split + 4, y: 0, width: bounds.width - split - 4, height: bounds.height };
      const mainRegion = side === 'left' ? leftRegion : rightRegion;
      const otherRegion = side === 'left' ? rightRegion : leftRegion;

      const mainRect = fillRegion(mainRegion, active);
      next[tabId] = {
        ...active,
        minimized: false,
        maximized: false,
        restoreRect: null,
        ...mainRect,
        z: nextZRef.current++
      };

      const others = Object.values(prev)
        .filter((tab) => tab.visible && tab.id !== tabId)
        .map((tab) => tab.id);

      placeTabsInRegion(others, otherRegion, prev, next);
      return next;
    });
  };

  useEffect(() => {
    const onResize = () => {
      if (!workspaceRef.current) {
        return;
      }
      const bounds = workspaceRef.current.getBoundingClientRect();
      setTabs((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.keys(next).forEach((id) => {
          if (next[id].maximized) {
            const rect = getMaximizedRect(next[id], bounds);
            next[id] = {
              ...next[id],
              ...rect
            };
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    };

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
//Rosbridge bağlantısı
  const rosRef=useRef(null)
  const logsRef=useRef([])

    useEffect(() => {
      const Ros_Url= 'ws://localhost:9090'; //kendi ıd'ini yaz
      console.log("Connecting to Rosbridge :", Ros_Url);
      const ros= new ROSLIB.Ros({
        url: Ros_Url
      });
      //ROSLIB.ros creates and manages a WebSocket connection to the ROS bridge server. The url parameter specifies the address of the ROS bridge server, which is typically running on the same machine as the web application or on a reachable network address. Once the connection is established, the ros object can be used to interact with ROS topics, services, and parameters. It also provides event handlers for connection status, allowing the application to respond to successful connections, errors, and disconnections appropriately.

      ros.on('connection', () =>{
        console.log("Connected to Rosbridge");
        setRosConnected(true);
        addLog("Connected to Rosbridge","success");
      });

      ros.on('error',(error) =>{
        console.log("Failed to connect to Rosbridge :",error);
        setRosConnected(false);
        addLog(`Failed to connect to Rosbridge : ${error}`, 'error');
      });

      ros.on('close',() =>{
        console.log('Connection to Rosbridge closed');
        setRosConnected(false);
        addLog('Connection to Rosbridge closed','warning');

        setTimeout(() => {
          console.log('Reconnecting to Rosbridge...');
          addLog('Reconnecting to Rosbridge','info');
        },5000);
      });

      rosRef.current=ros;
      return() =>{
        if(rosRef.current){
          rosRef.current.close();

        }
      };
      
    }, []);

  const addLog=(message,type) =>{
    const log = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString('tr-TR'),
      message,
      type
    };
    logsRef.current = [...logsRef.current, log];      
  };

  /*
  useEffect(() => {
    const timer = setTimeout(() => {
      setRosConnected(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);
*/
  function handleStart() {
    if (!emergencyStop) {
      setManualMode(true);
      console.log('Rover started');
    }
  }

  const handleStop = () => {
    setEmergencyStop(true);
    setManualMode(false);
    setAutonomousMode(false);
    console.log('Emergency stop active');
  };

  const handleReset = () => {
    setEmergencyStop(false);
    console.log('System reset');
  };

  const bringToFront = (tabId) => {
    setTabs((prev) => ({
      ...prev,
      [tabId]: { ...prev[tabId], z: nextZRef.current++ }
    }));
    setActiveTab(tabId);
  };

  const openTab = (tabId) => {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    setTabs((prev) => {
      const next = { ...prev };
      const reopened = {
        ...prev[tabId],
        visible: true,
        minimized: false,
        maximized: false,
        z: nextZRef.current++
      };

      if (bounds) {
        const free = findFreePosition(
          { x: reopened.x, y: reopened.y, width: reopened.width, height: reopened.height },
          tabId,
          { ...next, [tabId]: reopened },
          bounds
        );
        if (free) {
          reopened.x = free.x;
          reopened.y = free.y;
        }
      }

      next[tabId] = reopened;
      return next;
    });
    setActiveTab(tabId);
  };

  const closeTab = (tabId) => {
    setTabs((prev) => ({
      ...prev,
      [tabId]: { ...prev[tabId], visible: false }
    }));

    if (activeTab === tabId) {
      const visibleTabs = Object.values(tabs)
        .filter((tab) => tab.id !== tabId && tab.visible)
        .sort((a, b) => b.z - a.z);

      if (visibleTabs.length > 0) {
        setActiveTab(visibleTabs[0].id);
      }
    }
  };

  const resetLayout = () => {
    setTabs((prev) => {
      const next = { ...prev };
      Object.keys(TAB_LAYOUT).forEach((id) => {
        next[id] = {
          ...prev[id],
          ...TAB_LAYOUT[id],
          visible: true,
          minimized: false,
          maximized: false,
          restoreRect: null,
          z: nextZRef.current++
        };
      });
      return next;
    });
    setSnapGuide({ x: null, y: null });
  };

  const tileVisibleTabs = () => {
    if (!workspaceRef.current) {
      return;
    }

    const workspaceBounds = workspaceRef.current.getBoundingClientRect();
    const visibleIds = Object.keys(TAB_LAYOUT).filter((id) => tabs[id].visible);
    const count = visibleIds.length;

    if (count === 0) {
      return;
    }

    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const gap = 12;
    const cellWidth = Math.max(260, (workspaceBounds.width - gap * (cols + 1)) / cols);
    const cellHeight = Math.max(180, (workspaceBounds.height - gap * (rows + 1)) / rows);

    setTabs((prev) => {
      const next = { ...prev };
      visibleIds.forEach((id, index) => {
        const row = Math.floor(index / cols);
        const col = index % cols;

        next[id] = {
          ...prev[id],
          x: gap + col * (cellWidth + gap),
          y: gap + row * (cellHeight + gap),
          width: Math.max(prev[id].minWidth, Math.min(cellWidth, prev[id].maxWidth)),
          height: Math.max(prev[id].minHeight, Math.min(cellHeight, prev[id].maxHeight)),
          minimized: false,
          maximized: false,
          restoreRect: null,
          z: nextZRef.current++
        };
      });

      return next;
    });
  };

  const beginDrag = (event, tabId) => {
    if (!workspaceRef.current || event.button !== 0) {
      return;
    }

    const tab = tabs[tabId];
    if (tab.maximized) {
      return;
    }
    const workspaceRect = workspaceRef.current.getBoundingClientRect();

    dragRef.current = {
      tabId,
      offsetX: event.clientX - workspaceRect.left - tab.x,
      offsetY: event.clientY - workspaceRect.top - tab.y
    };

    setTabs((prev) => ({
      ...prev,
      [tabId]: { ...prev[tabId], z: nextZRef.current++ }
    }));
    setActiveTab(tabId);
    setDraggingTabId(tabId);

    const onMouseMove = (moveEvent) => {
      const dragState = dragRef.current;
      if (!workspaceRef.current || !dragState) {
        return;
      }

      const workspaceBounds = workspaceRef.current.getBoundingClientRect();
      const pointerX = moveEvent.clientX - workspaceBounds.left;

      if (pointerX <= EDGE_DOCK_THRESHOLD) {
        dockHintRef.current = 'left';
        setDockPreview('left');
      } else if (pointerX >= workspaceBounds.width - EDGE_DOCK_THRESHOLD) {
        dockHintRef.current = 'right';
        setDockPreview('right');
      } else {
        dockHintRef.current = null;
        setDockPreview(null);
      }

      setTabs((prev) => {
        const movingTab = prev[dragState.tabId];
        if (!movingTab) {
          return prev;
        }
        const movingWidth = movingTab.minimized ? MINIMIZED_WIDTH : movingTab.width;
        const movingHeight = movingTab.minimized ? MINIMIZED_HEIGHT : movingTab.height;

        const rawX = moveEvent.clientX - workspaceBounds.left - dragState.offsetX;
        const rawY = moveEvent.clientY - workspaceBounds.top - dragState.offsetY;
        const maxX = Math.max(0, workspaceBounds.width - movingWidth);
        const maxY = Math.max(0, workspaceBounds.height - movingHeight);

        let nextX = Math.min(maxX, Math.max(0, rawX));
        let nextY = Math.min(maxY, Math.max(0, rawY));

        const snapX = [0, maxX];
        const snapY = [0, maxY];

        Object.values(prev).forEach((other) => {
          if (!other.visible || other.id === movingTab.id) {
            return;
          }
          const otherWidth = other.minimized ? MINIMIZED_WIDTH : other.width;
          const otherHeight = other.minimized ? MINIMIZED_HEIGHT : other.height;

          snapX.push(other.x);
          snapX.push(other.x + otherWidth - movingWidth);
          snapX.push(other.x + otherWidth + DOCK_GAP);
          snapX.push(other.x - movingWidth - DOCK_GAP);

          snapY.push(other.y);
          snapY.push(other.y + otherHeight - movingHeight);
          snapY.push(other.y + otherHeight + DOCK_GAP);
          snapY.push(other.y - movingHeight - DOCK_GAP);
        });

        nextX = snapAxis(nextX, snapX, SNAP_THRESHOLD);
        nextY = snapAxis(nextY, snapY, SNAP_THRESHOLD);

        nextX = Math.min(maxX, Math.max(0, nextX));
        nextY = Math.min(maxY, Math.max(0, nextY));

        setSnapGuide({ x: nextX, y: nextY });

        const desired = { x: nextX, y: nextY, width: movingWidth, height: movingHeight };
        if (hasCollision(desired, movingTab.id, prev)) {
          const slideX = { ...desired, x: movingTab.x };
          const slideY = { ...desired, y: movingTab.y };
          if (!hasCollision(slideX, movingTab.id, prev)) {
            desired.x = movingTab.x;
          } else if (!hasCollision(slideY, movingTab.id, prev)) {
            desired.y = movingTab.y;
          } else {
            return prev;
          }
        }

        return {
          ...prev,
          [movingTab.id]: {
            ...movingTab,
            x: desired.x,
            y: desired.y
          }
        };
      });
    };

    const onMouseUp = () => {
      const dockSide = dockHintRef.current;
      dragRef.current = null;
      dockHintRef.current = null;
      setSnapGuide({ x: null, y: null });
      setDockPreview(null);
      setDraggingTabId(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      if (dockSide) {
        applyEdgeDock(tabId, dockSide);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const beginResize = (event, tabId) => {
    event.stopPropagation();
    if (!workspaceRef.current || event.button !== 0) {
      return;
    }

    const tab = tabs[tabId];
    if (tab.minimized || tab.maximized) {
      return;
    }

    resizeRef.current = {
      tabId,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: tab.width,
      startHeight: tab.height
    };
    setResizingTabId(tabId);
    bringToFront(tabId);

    const onMouseMove = (moveEvent) => {
      const resizeState = resizeRef.current;
      if (!workspaceRef.current || !resizeState) {
        return;
      }
      const workspaceBounds = workspaceRef.current.getBoundingClientRect();

      setTabs((prev) => {
        const current = prev[resizeState.tabId];
        if (!current) {
          return prev;
        }
        const deltaX = moveEvent.clientX - resizeState.startX;
        const deltaY = moveEvent.clientY - resizeState.startY;

        const maxAllowedWidth = Math.min(current.maxWidth, workspaceBounds.width - current.x);
        const maxAllowedHeight = Math.min(current.maxHeight, workspaceBounds.height - current.y);

        const nextWidth = Math.max(
          current.minWidth,
          Math.min(maxAllowedWidth, resizeState.startWidth + deltaX)
        );
        const nextHeight = Math.max(
          current.minHeight,
          Math.min(maxAllowedHeight, resizeState.startHeight + deltaY)
        );

        const candidateRect = {
          x: current.x,
          y: current.y,
          width: nextWidth,
          height: nextHeight
        };

        if (hasCollision(candidateRect, current.id, prev)) {
          return prev;
        }

        return {
          ...prev,
          [current.id]: {
            ...current,
            width: nextWidth,
            height: nextHeight
          }
        };
      });
    };

    const onMouseUp = () => {
      resizeRef.current = null;
      setResizingTabId(null);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const toggleMinimize = (tabId) => {
    const bounds = workspaceRef.current?.getBoundingClientRect();
    setTabs((prev) => {
      const next = { ...prev };
      const current = prev[tabId];
      const willMinimize = !current.minimized;
      const updated = {
        ...current,
        minimized: willMinimize,
        maximized: false
      };

      if (willMinimize && bounds) {
        const free = findFreePosition(
          { x: updated.x, y: updated.y, width: MINIMIZED_WIDTH, height: MINIMIZED_HEIGHT },
          tabId,
          { ...next, [tabId]: updated },
          bounds
        );
        if (free) {
          updated.x = free.x;
          updated.y = free.y;
        }
      }

      next[tabId] = updated;
      return next;
    });
    bringToFront(tabId);
  };

  const toggleMaximize = (tabId) => {
    if (!workspaceRef.current) {
      return;
    }

    const bounds = workspaceRef.current.getBoundingClientRect();

    setTabs((prev) => {
      const current = prev[tabId];
      if (!current) {
        return prev;
      }

      if (current.maximized && current.restoreRect) {
        const restored = {
          ...current,
          ...current.restoreRect,
          restoreRect: null,
          maximized: false
        };
        const free = findFreePosition(
          { x: restored.x, y: restored.y, width: restored.width, height: restored.height },
          tabId,
          { ...prev, [tabId]: restored },
          bounds
        );

        if (!free) {
          return prev;
        }

        return {
          ...prev,
          [tabId]: {
            ...restored,
            x: free.x,
            y: free.y
          }
        };
      }

      const next = { ...prev };
      const visibleOthers = Object.values(next).filter((tab) => tab.visible && tab.id !== tabId);
      const rowGap = 6;
      const colGap = 6;
      const perRow = Math.max(1, Math.floor((bounds.width - 8) / (MINIMIZED_WIDTH + colGap)));
      const rows = Math.ceil(visibleOthers.length / perRow);
      const reservedHeight = rows > 0 ? rows * (MINIMIZED_HEIGHT + rowGap) + rowGap : 0;
      const availableHeight = Math.max(current.minHeight, bounds.height - reservedHeight);

      visibleOthers.forEach((tab, index) => {
        const row = Math.floor(index / perRow);
        const col = index % perRow;
        next[tab.id] = {
          ...tab,
          minimized: true,
          maximized: false,
          x: 8 + col * (MINIMIZED_WIDTH + colGap),
          y: bounds.height - (row + 1) * (MINIMIZED_HEIGHT + rowGap),
          z: nextZRef.current++
        };
      });

      const maxRect = getMaximizedRect(current, { width: bounds.width, height: availableHeight });
      next[tabId] = {
        ...current,
        restoreRect: {
          x: current.x,
          y: current.y,
          width: current.width,
          height: current.height
        },
        ...maxRect,
        minimized: false,
        maximized: true
      };

      return next;
    });

    bringToFront(tabId);
  };
  //rosRef.current ekledim
  const renderTabBody = (tabId) => {
    if (tabId === 'camera') {
      return <CameraPanel ros={rosRef.current} rosConnected={rosConnected} />;
    }
    if (tabId === 'map') {
      return <MapPanel ros={rosRef.current} rosConnected={rosConnected} />;
    }
    if (tabId === 'logs') {
      return <LogPanel ros={rosRef.current} rosConnected={rosConnected} />;
    }
    if (tabId === 'tasks') {
      return <TaskPanel />;
    }
    return null;
  };

  const orderedTabs = Object.values(tabs).sort((a, b) => a.z - b.z);

  return (
    <div className="App">
      <TopBar
        batteryLevel={batteryLevel}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
        autonomousMode={autonomousMode}
        manualMode={manualMode}
        emergencyStop={emergencyStop}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />

      <div className="workspace-shell">
        <div className="tab-strip">
          {!scienceMode && Object.values(TAB_LAYOUT).map((tab) => {
            const isVisible = tabs[tab.id].visible;
            return (
              <button
                key={tab.id}
                className={`tab-chip ${activeTab === tab.id && isVisible ? 'active' : ''}`}
                onClick={() => (isVisible ? bringToFront(tab.id) : openTab(tab.id))}
              >
                {tab.title}
              </button>
            );
          })}

          {!scienceMode && <button className="tab-tool" onClick={tileVisibleTabs}>Pencere Hizala</button>}
          {!scienceMode && <button className="tab-tool ghost" onClick={resetLayout}>Varsayilan</button>}
          <button
            className="tab-tool"
            onClick={() => setScienceMode((prev) => !prev)}
          >
            {scienceMode ? 'Ana Ekran' : 'Science Ekrani'}
          </button>
        </div>

        {scienceMode ? (
          <div className="science-screen">
            <SciencePanel 
            rosConnected={rosConnected} 
            ros={rosRef.current} />
          
          </div>
        ) : (
          <div className="tab-workspace" ref={workspaceRef}>
            {dockPreview && <div className={`dock-preview ${dockPreview}`} />}
            {snapGuide.x !== null && <div className="snap-guide-x" style={{ left: snapGuide.x }} />}
            {snapGuide.y !== null && <div className="snap-guide-y" style={{ top: snapGuide.y }} />}

            {orderedTabs.map((tab) => (
              tab.visible && (
                <section
                  key={tab.id}
                  className={`floating-tab ${activeTab === tab.id ? 'active' : ''} ${tab.minimized ? 'minimized' : ''} ${draggingTabId === tab.id ? 'dragging' : ''} ${resizingTabId === tab.id ? 'resizing' : ''}`}
                  style={{
                    left: tab.x,
                    top: tab.y,
                    width: tab.minimized ? MINIMIZED_WIDTH : tab.width,
                    height: tab.minimized ? MINIMIZED_HEIGHT : tab.height,
                    zIndex: tab.z
                  }}
                  onMouseDown={() => bringToFront(tab.id)}
                >
                  <div
                    className="floating-tab-header"
                    onMouseDown={(event) => beginDrag(event, tab.id)}
                  >
                    <div
                      className="window-controls"
                      onMouseDown={(event) => event.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="window-btn red"
                        onClick={(event) => {
                          event.stopPropagation();
                          closeTab(tab.id);
                        }}
                        title="Kapat"
                      />
                      <button
                        type="button"
                        className="window-btn yellow"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleMinimize(tab.id);
                        }}
                        title="Kucult"
                      />
                      <button
                        type="button"
                        className="window-btn green"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleMaximize(tab.id);
                        }}
                        title="Tam ekran"
                      />
                    </div>
                    <span>{tab.title}</span>
                    <div className="floating-tab-close-slot" />
                  </div>
                  {!tab.minimized && (
                    <>
                      <div className="floating-tab-body">{renderTabBody(tab.id)}</div>
                      <button
                        type="button"
                        className="resize-handle"
                        onMouseDown={(event) => beginResize(event, tab.id)}
                        aria-label={`${tab.title} resize`}
                      />
                    </>
                  )}
                </section>
              )
            ))}

            {!orderedTabs.some((tab) => tab.visible) && (
              <div className="workspace-placeholder">
                Tum sekmeler kapali. Yukaridaki sekmelerden birini acabilirsin.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
