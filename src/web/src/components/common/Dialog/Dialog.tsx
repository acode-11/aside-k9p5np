import React, { useCallback, useEffect, memo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { IconButton, Typography, Fade, useMediaQuery, useTheme } from '@mui/material'; // v5.14+
import { Close } from '@mui/icons-material'; // v5.14+
import {
  StyledDialog,
  StyledDialogTitle,
  StyledDialogContent,
  StyledDialogActions
} from './Dialog.styles';
import { uiActions } from '../../../store/slices/uiSlice';

export interface DialogProps {
  id: string;
  open: boolean;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  maxWidth?: false | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  onClose?: () => void;
  keepMounted?: boolean;
  disableEscapeKeyDown?: boolean;
  transitionDuration?: number;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * A reusable dialog component with enhanced accessibility, responsive behavior,
 * and integration with the application's design system.
 *
 * @version 1.0.0
 * @component
 */
const Dialog: React.FC<DialogProps> = memo(({
  id,
  open,
  title,
  children,
  actions,
  maxWidth = 'sm',
  fullWidth = true,
  onClose,
  keepMounted = false,
  disableEscapeKeyDown = false,
  transitionDuration = 225,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Handle dialog close with stack management
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    }
    dispatch(uiActions.toggleDialog({ dialog: null }));
  }, [dispatch, onClose]);

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!disableEscapeKeyDown && event.key === 'Escape') {
      handleClose();
    }

    // Trap focus within dialog when using Tab
    if (event.key === 'Tab') {
      const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (event.shiftKey && document.activeElement === firstFocusable) {
        event.preventDefault();
        lastFocusable.focus();
      } else if (!event.shiftKey && document.activeElement === lastFocusable) {
        event.preventDefault();
        firstFocusable.focus();
      }
    }
  }, [disableEscapeKeyDown, handleClose]);

  // Focus management
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        const dialogElement = document.getElementById(id);
        if (dialogElement) {
          const firstFocusable = dialogElement.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          if (firstFocusable) {
            firstFocusable.focus();
          }
        }
      }, transitionDuration);

      return () => clearTimeout(timer);
    }
  }, [open, id, transitionDuration]);

  return (
    <StyledDialog
      id={id}
      open={open}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      onClose={handleClose}
      keepMounted={keepMounted}
      TransitionComponent={Fade}
      TransitionProps={{ timeout: transitionDuration }}
      aria-labelledby={ariaLabel || `${id}-title`}
      aria-describedby={ariaDescribedBy}
      onKeyDown={handleKeyDown}
    >
      {title && (
        <StyledDialogTitle>
          <Typography variant="h2" component="h2" id={`${id}-title`}>
            {title}
          </Typography>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            size={isMobile ? "small" : "medium"}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: theme => theme.palette.grey[500],
            }}
          >
            <Close />
          </IconButton>
        </StyledDialogTitle>
      )}

      <StyledDialogContent>
        {children}
      </StyledDialogContent>

      {actions && (
        <StyledDialogActions>
          {actions}
        </StyledDialogActions>
      )}
    </StyledDialog>
  );
});

Dialog.displayName = 'Dialog';

export default Dialog;