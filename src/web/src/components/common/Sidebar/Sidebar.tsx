import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
  Tooltip,
  Drawer,
  Box
} from '@mui/material';
import {
  DashboardOutlined as DashboardIcon,
  LibraryBooksOutlined as LibraryBooksIcon,
  GroupOutlined as GroupIcon,
  BarChartOutlined as BarChartIcon,
  SettingsOutlined as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Menu as MenuIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

import {
  SidebarContainer,
  SidebarDrawer,
  SidebarContent
} from './Sidebar.styles';
import { ROUTES } from '../../../constants/routes.constants';
import { useAuth } from '../../../hooks/useAuth';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  persistentDrawer?: boolean;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  requiresAuth: boolean;
  ariaLabel?: string;
}

const Sidebar: React.FC<SidebarProps> = memo(({ open, onToggle, persistentDrawer = true }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Track whether drawer should be temporary (mobile) or persistent
  const [isTemporary, setIsTemporary] = useState(isMobile);

  // Update drawer type based on screen size
  useEffect(() => {
    setIsTemporary(isMobile);
  }, [isMobile]);

  // Memoized navigation items
  const navItems = useMemo<NavItem[]>(() => [
    {
      path: ROUTES.DASHBOARD,
      label: 'Dashboard',
      icon: <DashboardIcon />,
      requiresAuth: true,
      ariaLabel: 'Navigate to dashboard'
    },
    {
      path: ROUTES.DETECTION_LIBRARY,
      label: 'Detection Library',
      icon: <LibraryBooksIcon />,
      requiresAuth: true,
      ariaLabel: 'Navigate to detection library'
    },
    {
      path: ROUTES.COMMUNITY,
      label: 'Community',
      icon: <GroupIcon />,
      requiresAuth: true,
      ariaLabel: 'Navigate to community'
    },
    {
      path: ROUTES.ANALYTICS,
      label: 'Analytics',
      icon: <BarChartIcon />,
      requiresAuth: true,
      ariaLabel: 'Navigate to analytics'
    },
    {
      path: ROUTES.SETTINGS,
      label: 'Settings',
      icon: <SettingsIcon />,
      requiresAuth: true,
      ariaLabel: 'Navigate to settings'
    }
  ], []);

  // Handle navigation with auth check
  const handleNavigation = useCallback((path: string, requiresAuth: boolean) => {
    if (requiresAuth && !isAuthenticated) {
      // Handle unauthorized access attempt
      return;
    }
    navigate(path);
    if (isTemporary) {
      onToggle();
    }
  }, [isAuthenticated, navigate, onToggle, isTemporary]);

  // Render drawer content
  const drawerContent = (
    <SidebarContent isCollapsed={!open}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: 1 }}>
        <IconButton onClick={onToggle} aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}>
          {theme.direction === 'rtl' ? (
            open ? <ChevronRightIcon /> : <ChevronLeftIcon />
          ) : (
            open ? <ChevronLeftIcon /> : <ChevronRightIcon />
          )}
        </IconButton>
      </Box>
      <Divider />
      <List component="nav" aria-label="Main navigation">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip
              key={item.path}
              title={!open ? item.label : ''}
              placement={theme.direction === 'rtl' ? 'left' : 'right'}
            >
              <ListItem
                button
                onClick={() => handleNavigation(item.path, item.requiresAuth)}
                selected={isActive}
                aria-label={item.ariaLabel}
                sx={{
                  justifyContent: open ? 'initial' : 'center',
                  px: 2.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.action.selected
                  }
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center'
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {open && <ListItemText primary={item.label} />}
              </ListItem>
            </Tooltip>
          );
        })}
      </List>
    </SidebarContent>
  );

  // Render appropriate drawer variant based on screen size
  return isTemporary ? (
    <SidebarDrawer
      variant="temporary"
      anchor={theme.direction === 'rtl' ? 'right' : 'left'}
      open={open}
      onClose={onToggle}
      ModalProps={{ keepMounted: true }}
    >
      {drawerContent}
    </SidebarDrawer>
  ) : (
    <SidebarContainer
      variant="permanent"
      open={open}
      sx={{
        width: open ? 240 : 64,
        transition: theme.transitions.create('width', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen
        })
      }}
    >
      {drawerContent}
    </SidebarContainer>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;