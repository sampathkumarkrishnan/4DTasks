import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  IconButton,
  Checkbox,
  Chip,
  Tooltip,
  TextField,
  Collapse,
  Divider,
  Popover,
  alpha,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AddIcon from '@mui/icons-material/Add';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs from 'dayjs';
import { useTasks } from '../../context/TaskContext';

// ── SubtaskRow ──────────────────────────────────────────────────────────────
// Renders a single subtask row with inline title editing, due-date chip (with
// date-picker popover), and a hover-reveal delete button.
// Checkbox is rendered but disabled — wired in Ticket 3 (cascade).
function SubtaskRow({ subtask, parentTaskId }) {
  const { updateSubtask, deleteSubtask, toggleSubtaskComplete } = useTasks();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(subtask.cleanTitle || subtask.title || '');
  const [dateAnchor, setDateAnchor] = useState(null);
  const titleInputRef = useRef(null);

  const isCompleted = subtask.status === 'completed';
  const due = subtask.due ? dayjs(subtask.due) : null;
  const isOverdue = due && due.isBefore(dayjs(), 'day') && !isCompleted;

  // ── Completion toggle ──────────────────────────────────────────────────────

  const handleToggleComplete = async (e) => {
    e.stopPropagation();
    try {
      await toggleSubtaskComplete(parentTaskId, subtask.id);
    } catch {}
  };

  // ── Title editing ──────────────────────────────────────────────────────────

  const handleTitleClick = (e) => {
    e.stopPropagation();
    if (isCompleted) return;
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  };

  const handleTitleSave = async () => {
    setIsEditingTitle(false);
    const trimmed = editTitle.trim();
    const original = subtask.cleanTitle || subtask.title || '';
    if (!trimmed || trimmed === original) {
      setEditTitle(original);
      return;
    }
    try {
      await updateSubtask(parentTaskId, subtask.id, { title: trimmed });
    } catch {
      setEditTitle(original);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') handleTitleSave();
    if (e.key === 'Escape') {
      setEditTitle(subtask.cleanTitle || subtask.title || '');
      setIsEditingTitle(false);
    }
  };

  // ── Due date ───────────────────────────────────────────────────────────────

  const handleDateChipClick = (e) => {
    e.stopPropagation();
    setDateAnchor(e.currentTarget);
  };

  const handleDateChange = async (newDate) => {
    setDateAnchor(null);
    const dueValue = newDate ? newDate.toISOString() : null;
    try {
      await updateSubtask(parentTaskId, subtask.id, { due: dueValue });
    } catch {}
  };

  const handleDateClear = async (e) => {
    e.stopPropagation();
    setDateAnchor(null);
    try {
      await updateSubtask(parentTaskId, subtask.id, { due: null });
    } catch {}
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async (e) => {
    e.stopPropagation();
    try {
      await deleteSubtask(parentTaskId, subtask.id);
    } catch {}
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        py: 0.25,
        borderRadius: 1,
        minWidth: 0,
        '&:hover .subtask-action': { opacity: 1 },
      }}
    >
      {/* Completion checkbox — triggers bi-directional cascade (ADR 0004) */}
      <Checkbox
        checked={isCompleted}
        onChange={handleToggleComplete}
        size="small"
        sx={{
          p: 0.25,
          flexShrink: 0,
          color: 'action.disabled',
          '&.Mui-checked': { color: 'primary.main' },
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Title — click to inline-edit */}
      {isEditingTitle ? (
        <TextField
          inputRef={titleInputRef}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleTitleSave}
          onKeyDown={handleTitleKeyDown}
          onClick={(e) => e.stopPropagation()}
          size="small"
          variant="standard"
          sx={{ flex: 1, minWidth: 0 }}
          inputProps={{ style: { fontSize: '0.8rem', padding: '1px 0' } }}
        />
      ) : (
        <Typography
          variant="body2"
          onClick={handleTitleClick}
          sx={{
            flex: 1,
            minWidth: 0,
            fontSize: '0.8rem',
            cursor: isCompleted ? 'default' : 'text',
            textDecoration: isCompleted ? 'line-through' : 'none',
            color: isCompleted ? 'text.disabled' : 'text.primary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {subtask.cleanTitle || subtask.title}
        </Typography>
      )}

      {/* Due date chip — click to open date picker */}
      {due ? (
        <Tooltip title={`Due: ${due.format('MMMM D, YYYY')} — click to change`}>
          <Chip
            icon={<AccessTimeIcon sx={{ fontSize: '11px !important' }} />}
            label={due.format('MMM D')}
            size="small"
            onClick={handleDateChipClick}
            sx={{
              height: 18,
              fontSize: '0.68rem',
              flexShrink: 0,
              cursor: 'pointer',
              bgcolor: isOverdue ? alpha('#F44336', 0.15) : 'action.selected',
              color: isOverdue ? 'error.main' : 'text.secondary',
              '& .MuiChip-icon': { color: 'inherit' },
              '&:hover': { bgcolor: isOverdue ? alpha('#F44336', 0.25) : 'action.focus' },
            }}
          />
        </Tooltip>
      ) : (
        /* No due date — show clock icon on hover */
        <Tooltip title="Set due date">
          <IconButton
            size="small"
            onClick={handleDateChipClick}
            className="subtask-action"
            sx={{ p: 0.25, opacity: 0, transition: 'opacity 0.15s', flexShrink: 0, color: 'text.disabled' }}
          >
            <AccessTimeIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Tooltip>
      )}

      {/* Date picker popover */}
      <Popover
        open={Boolean(dateAnchor)}
        anchorEl={dateAnchor}
        onClose={() => setDateAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box sx={{ p: 0 }}>
          <DateCalendar
            value={due}
            onChange={handleDateChange}
          />
          {due && (
            <Box sx={{ px: 2, pb: 1.5 }}>
              <Typography
                variant="caption"
                onClick={handleDateClear}
                sx={{ cursor: 'pointer', color: 'error.main', '&:hover': { textDecoration: 'underline' } }}
              >
                Clear date
              </Typography>
            </Box>
          )}
        </Box>
      </Popover>

      {/* Delete button — hover-revealed */}
      <Tooltip title="Delete subtask">
        <IconButton
          size="small"
          onClick={handleDelete}
          className="subtask-action"
          sx={{
            p: 0.25,
            opacity: 0,
            transition: 'opacity 0.15s',
            flexShrink: 0,
            color: 'error.main',
          }}
        >
          <DeleteOutlineIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ── SubtaskAccordion ─────────────────────────────────────────────────────────
// Standalone accordion rendered at the bottom of TaskCard and BacklogCard.
// Shows progress badge (X/Y) in its header; expands to show subtask list and
// an inline "Add subtask" input row.
function SubtaskAccordion({ task }) {
  const { addSubtask } = useTasks();

  const [expanded, setExpanded] = useState(false);
  const [isAddingMode, setIsAddingMode] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const addInputRef = useRef(null);

  const subtasks = task.subtasks || [];
  const completedCount = subtasks.filter((s) => s.status === 'completed').length;
  const totalCount = subtasks.length;
  const hasOverdueIncomplete = subtasks.some(
    (s) => s.status !== 'completed' && s.due && dayjs(s.due).isBefore(dayjs(), 'day')
  );

  const badgeColor = hasOverdueIncomplete ? 'error.main' : 'text.secondary';
  const badgeBg = hasOverdueIncomplete ? alpha('#F44336', 0.12) : 'action.selected';

  // ── Add subtask ───────────────────────────────────────────────────────────

  const handleAddClick = (e) => {
    e.stopPropagation();
    setExpanded(true);
    setIsAddingMode(true);
    setTimeout(() => addInputRef.current?.focus(), 50);
  };

  const handleAddSave = async () => {
    const trimmed = newTitle.trim();
    setIsAddingMode(false);
    setNewTitle('');
    if (!trimmed) return;
    try {
      await addSubtask(task.id, { title: trimmed });
    } catch {}
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') handleAddSave();
    if (e.key === 'Escape') {
      setIsAddingMode(false);
      setNewTitle('');
    }
  };

  return (
    <Box onClick={(e) => e.stopPropagation()}>
      <Divider sx={{ mt: 0.75, mb: 0.25 }} />

      {/* Accordion header row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          borderRadius: 1,
          px: 0.5,
          py: 0.25,
          '&:hover': { bgcolor: 'action.hover' },
        }}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <ExpandMoreIcon
          sx={{
            fontSize: 15,
            color: 'text.disabled',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
          }}
        />
        <Typography
          variant="caption"
          color="text.disabled"
          sx={{ flex: 1, userSelect: 'none', fontSize: '0.72rem' }}
        >
          Subtasks
        </Typography>

        {/* Progress badge — shown when subtasks exist */}
        {totalCount > 0 && (
          <Chip
            label={`${completedCount} / ${totalCount}`}
            size="small"
            sx={{
              height: 16,
              fontSize: '0.65rem',
              bgcolor: badgeBg,
              color: badgeColor,
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        )}

        {/* Add button in header */}
        <Tooltip title="Add subtask">
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); handleAddClick(e); }}
            sx={{ p: 0.25, color: 'text.disabled', ml: 0.25 }}
          >
            <AddIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Expanded content */}
      <Collapse in={expanded}>
        <Box sx={{ pl: 0.5, pt: 0.25 }}>
          {subtasks.map((subtask) => (
            <SubtaskRow key={subtask.id} subtask={subtask} parentTaskId={task.id} />
          ))}

          {/* Add subtask row */}
          {isAddingMode ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.25, pl: 0.25 }}>
              <AddIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
              <TextField
                inputRef={addInputRef}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onBlur={handleAddSave}
                onKeyDown={handleAddKeyDown}
                onClick={(e) => e.stopPropagation()}
                placeholder="Subtask title…"
                size="small"
                variant="standard"
                sx={{ flex: 1 }}
                inputProps={{ style: { fontSize: '0.8rem' } }}
              />
            </Box>
          ) : (
            <Box
              onClick={(e) => { e.stopPropagation(); handleAddClick(e); }}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                py: 0.25,
                px: 0.5,
                cursor: 'pointer',
                borderRadius: 1,
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <AddIcon sx={{ fontSize: 13, color: 'text.disabled' }} />
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.72rem' }}>
                Add subtask
              </Typography>
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

export default SubtaskAccordion;
