import React, { useState, useEffect } from 'react';
import './TaskPanel.css';

function TaskPanel() {
  const [tasks, setTasks] = useState([
    { id: 1, text: 'Verify GPS location', completed: true },
    { id: 2, text: 'Calibration of camera', completed: true },
    { id: 3, text: 'Check sensor data', completed: false },
    { id: 4, text: 'Autonomous driving test', completed: false },
    { id: 5, text: 'Start the data gathering', completed: false }
  ]);
  
  const [newTaskText, setNewTaskText] = useState('');
  const [missionTime, setMissionTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setMissionTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(task =>
      task.id === id ? { ...task, completed: !task.completed } : task
    ));
  };

  const addTask = () => {
    if (newTaskText.trim()) {
      const newTask = {
        id: Date.now(),
        text: newTaskText,
        completed: false
      };
      setTasks([...tasks, newTask]);
      setNewTaskText('');
    }
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  return (
    <div className="panel task-panel">
      <div className="panel-header">
        TASKS
      </div>
      
      <div className="panel-content">
        {/* Zaman Sayacı */}
        <div className="timer-section">
          <div className="timer-display">{formatTime(missionTime)}</div>
          <div className="timer-label">Duration of Tasks</div>
          <div className="timer-controls">
            <button 
              className="timer-button start"
              onClick={() => setIsTimerRunning(true)}
              disabled={isTimerRunning}
            >
              ▶
            </button>
            <button 
              className="timer-button pause"
              onClick={() => setIsTimerRunning(false)}
              disabled={!isTimerRunning}
            >
              ⏸
            </button>
            <button 
              className="timer-button reset"
              onClick={() => { setMissionTime(0); setIsTimerRunning(false); }}
            >
              ⏹
            </button>
          </div>
        </div>

        {/* İlerleme Çubuğu */}
        <div className="progress-section">
          <div className="progress-header">
            <span>Progress</span>
            <span>{completedCount}/{tasks.length}</span>
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Görev Listesi */}
        <div className="tasks-section">
          <div className="add-task-form">
            <input
              type="text"
              placeholder="Add a new task..."
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTask()}
              className="task-input"
            />
            <button onClick={addTask} className="add-task-button">+</button>
          </div>

          <div className="task-list">
            {tasks.length === 0 ? (
              <div className="no-tasks">No task yet.</div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTask(task.id)}
                    className="task-checkbox"
                  />
                  <span className="task-text">{task.text}</span>
                  <button 
                    className="delete-task-button"
                    onClick={() => deleteTask(task.id)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TaskPanel;
