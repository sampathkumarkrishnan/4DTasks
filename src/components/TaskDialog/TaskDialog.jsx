import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  alpha,
  Autocomplete,
  Chip,
  createFilterOptions,
  CircularProgress,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';
import { useTasks } from '../../context/TaskContext';
import { useThemeMode } from '../../context/ThemeContext';
import { getQuadrantConfig } from '../../theme/theme';

const filter = createFilterOptions();

function TaskDialog({ open, onClose, quadrant, task, onSuccess }) {
  const { mode } = useThemeMode();
  const quadrantConfig = getQuadrantConfig(mode);
  const { createTask, updateTask, createCategory, changeTaskCategory, taskLists } = useTasks();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    quadrant: 'do',
    due: null,
    delegatedTo: '',
    categoryListId: null, // Now stores the list ID, not a string name
  });

  const isEditing = !!task;

  useEffect(() => {
    if (open) {
      if (task) {
        setFormData({
          title: task.cleanTitle || task.title || '', // Use cleanTitle (without prefix) for editing
          notes: task.displayNotes || '',
          quadrant: task.metadata?.quadrant || quadrant || 'do',
          due: task.due ? dayjs(task.due) : null,
          delegatedTo: task.metadata?.delegatedTo || '',
          categoryListId: task.listId || null, // Use the task's list ID
        });
      } else {
        setFormData({
          title: '',
          notes: '',
          quadrant: quadrant || 'do',
          due: null,
          delegatedTo: '',
          categoryListId: null,
        });
      }
    }
  }, [open, task, quadrant]);

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleDateChange = (newValue) => {
    setFormData((prev) => ({
      ...prev,
      due: newValue,
    }));
  };

  const handleCategoryChange = async (event, newValue) => {
    if (!newValue) {
      // Cleared the selection
      setFormData((prev) => ({ ...prev, categoryListId: null }));
      return;
    }
    
    if (typeof newValue === 'object' && newValue.inputValue) {
      // User wants to create a new category (list)
      setIsCreatingCategory(true);
      try {
        const newList = await createCategory(newValue.inputValue);
        setFormData((prev) => ({ ...prev, categoryListId: newList.id }));
      } catch (error) {
        console.error('Failed to create category:', error);
      } finally {
        setIsCreatingCategory(false);
      }
    } else if (typeof newValue === 'object' && newValue.id) {
      // User selected an existing list
      setFormData((prev) => ({ ...prev, categoryListId: newValue.id }));
    }
  };

  // Get the currently selected list object
  const getSelectedList = () => {
    if (!formData.categoryListId) return null;
    return taskLists.find((list) => list.id === formData.categoryListId) || null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!formData.title.trim()) return;

    setIsSubmitting(true);

    try {
      const taskData = {
        title: formData.title.trim(),
        notes: formData.notes.trim(),
        quadrant: formData.quadrant,
        due: formData.due ? formData.due.toISOString() : null,
        delegatedTo: formData.quadrant === 'delegate' ? formData.delegatedTo : null,
        categoryListId: formData.categoryListId,
      };

      if (isEditing) {
        // Check if category (list) changed
        if (task.listId !== formData.categoryListId && formData.categoryListId) {
          // Move task to new list first
          const movedTask = await changeTaskCategory(task.id, formData.categoryListId);
          // Then update other properties on the new task
          await updateTask(movedTask.id, {
            title: taskData.title,
            notes: taskData.notes,
            quadrant: taskData.quadrant,
            due: taskData.due,
            delegatedTo: taskData.delegatedTo,
          });
        } else {
          // Same list, just update
          await updateTask(task.id, taskData);
        }
        onSuccess?.('Task updated successfully');
      } else {
        await createTask(taskData);
        onSuccess?.('Task created successfully');
      }
      
      onClose();
    } catch (error) {
      console.error('Failed to save task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showDatePicker = formData.quadrant === 'do' || formData.quadrant === 'delay';
  const showDelegateField = formData.quadrant === 'delegate';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        component: 'form',
        onSubmit: handleSubmit,
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
          {isEditing ? 'Edit Task' : 'New Task'}
        </Typography>
        {quadrant && (
          <Chip
            label={quadrantConfig[quadrant]?.title}
            size="small"
            sx={{
              ml: 1.5,
              bgcolor: alpha(quadrantConfig[quadrant]?.color || '#6B8F71', 0.3),
            }}
          />
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 1, overflow: 'visible' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          <TextField
            autoFocus
            label="Task title"
            value={formData.title}
            onChange={handleChange('title')}
            fullWidth
            required
            placeholder="What needs to be done?"
            sx={{ mt: 1 }}
          />

          <TextField
            label="Notes"
            value={formData.notes}
            onChange={handleChange('notes')}
            fullWidth
            multiline
            rows={2}
            placeholder="Add details or context..."
          />

          <FormControl fullWidth>
            <InputLabel>Quadrant</InputLabel>
            <Select
              value={formData.quadrant}
              label="Quadrant"
              onChange={handleChange('quadrant')}
            >
              {Object.entries(quadrantConfig).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: 0.5,
                        bgcolor: config.color,
                      }}
                    />
                    {config.title} - {config.subtitle}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {showDatePicker && (
            <DatePicker
              label={formData.quadrant === 'do' ? 'Due date' : 'Schedule for'}
              value={formData.due}
              onChange={handleDateChange}
              slotProps={{
                textField: {
                  fullWidth: true,
                  helperText: formData.quadrant === 'delay' 
                    ? 'When should this task be done?' 
                    : 'When is this due?',
                },
              }}
            />
          )}

          {showDelegateField && (
            <TextField
              label="Delegate to (email)"
              type="email"
              value={formData.delegatedTo}
              onChange={handleChange('delegatedTo')}
              fullWidth
              placeholder="colleague@example.com"
              helperText="Enter the email of the person to delegate this task to"
            />
          )}

          <Autocomplete
            value={getSelectedList()}
            onChange={handleCategoryChange}
            disabled={isCreatingCategory}
            filterOptions={(options, params) => {
              const filtered = filter(options, params);
              const { inputValue } = params;
              
              // Suggest creating a new category (Google Tasks List)
              const isExisting = options.some(
                (option) => option.title?.toLowerCase() === inputValue.toLowerCase()
              );
              if (inputValue !== '' && !isExisting) {
                filtered.push({
                  inputValue,
                  title: `Create list "${inputValue}"`,
                  isNew: true,
                });
              }
              
              return filtered;
            }}
            selectOnFocus
            clearOnBlur
            handleHomeEndKeys
            options={taskLists}
            getOptionLabel={(option) => {
              if (!option) return '';
              if (option.inputValue) {
                return option.inputValue;
              }
              return option.title || '';
            }}
            isOptionEqualToValue={(option, value) => {
              if (!option || !value) return false;
              return option.id === value.id;
            }}
            renderOption={(props, option) => {
              const { key, ...restProps } = props;
              return (
                <li key={key} {...restProps}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {option.isNew ? (
                      <Typography color="primary">{option.title}</Typography>
                    ) : (
                      <Typography>{option.title}</Typography>
                    )}
                  </Box>
                </li>
              );
            }}
            freeSolo
            renderInput={(params) => (
              <TextField
                {...params}
                label="Category / List (optional)"
                placeholder="Select or create a Google Tasks list"
                helperText="Tasks are organized by Google Tasks Lists"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: (
                    <>
                      {isCreatingCategory && <CircularProgress size={20} />}
                      {params.InputProps.endAdornment}
                    </>
                  ),
                }}
              />
            )}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={!formData.title.trim() || isSubmitting || isCreatingCategory}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default TaskDialog;
