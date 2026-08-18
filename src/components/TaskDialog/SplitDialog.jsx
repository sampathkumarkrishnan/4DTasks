import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

function SplitDialog({ open, onClose, task, onConfirm }) {
  const [children, setChildren] = useState(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setChildren(['', '']);
    }
  }, [open]);

  const updateChild = (index, value) => {
    setChildren((prev) => prev.map((c, i) => (i === index ? value : c)));
  };

  const addRow = () => setChildren((prev) => [...prev, '']);
  const removeRow = (index) => {
    if (children.length <= 1) return;
    setChildren((prev) => prev.filter((_, i) => i !== index));
  };

  const validChildren = children.filter((c) => c.trim());

  const handleSubmit = async () => {
    if (validChildren.length === 0) return;
    setIsSubmitting(true);
    try {
      await onConfirm(validChildren);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Split into tactical tasks</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Breaking down: <strong>{task?.cleanTitle || task?.title}</strong>
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {children.map((child, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                label={`Tactical task ${index + 1}`}
                value={child}
                onChange={(e) => updateChild(index, e.target.value)}
                fullWidth
                size="small"
              />
              <IconButton
                size="small"
                onClick={() => removeRow(index)}
                disabled={children.length <= 1}
              >
                <RemoveIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
          <Button startIcon={<AddIcon />} onClick={addRow} size="small" sx={{ alignSelf: 'flex-start' }}>
            Add another
          </Button>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || validChildren.length === 0}
        >
          {isSubmitting ? 'Creating...' : `Create ${validChildren.length} task${validChildren.length !== 1 ? 's' : ''}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default SplitDialog;
