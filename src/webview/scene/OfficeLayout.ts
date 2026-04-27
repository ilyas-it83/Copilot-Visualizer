import { Point, OfficeLocation, Rect } from '../types';

export interface LocationDef {
  id: OfficeLocation;
  position: Point;
  size: Rect;
  label: string;
}

// Waypoints for agent pathfinding between locations
export interface Waypoint {
  id: string;
  position: Point;
  connections: string[];
}

// Office dimensions: 800x500 logical units
export const OFFICE_WIDTH = 800;
export const OFFICE_HEIGHT = 500;

export const LOCATIONS: LocationDef[] = [
  { id: 'desk', position: { x: 120, y: 150 }, size: { x: 100, y: 130, width: 80, height: 50 }, label: 'Desk 1' },
  { id: 'desk', position: { x: 250, y: 150 }, size: { x: 230, y: 130, width: 80, height: 50 }, label: 'Desk 2' },
  { id: 'desk', position: { x: 380, y: 150 }, size: { x: 360, y: 130, width: 80, height: 50 }, label: 'Desk 3' },
  { id: 'desk', position: { x: 510, y: 150 }, size: { x: 490, y: 130, width: 80, height: 50 }, label: 'Desk 4' },
  { id: 'terminal', position: { x: 680, y: 100 }, size: { x: 650, y: 80, width: 100, height: 70 }, label: 'Terminal' },
  { id: 'file_cabinet', position: { x: 680, y: 250 }, size: { x: 660, y: 230, width: 80, height: 60 }, label: 'Files' },
  { id: 'meeting_table', position: { x: 350, y: 370 }, size: { x: 300, y: 340, width: 140, height: 100 }, label: 'Meeting' },
  { id: 'search_station', position: { x: 120, y: 370 }, size: { x: 90, y: 350, width: 90, height: 60 }, label: 'Search' },
  { id: 'whiteboard', position: { x: 550, y: 370 }, size: { x: 530, y: 350, width: 100, height: 80 }, label: 'Whiteboard' },
  { id: 'coffee_machine', position: { x: 50, y: 250 }, size: { x: 30, y: 230, width: 60, height: 50 }, label: 'Coffee' },
  { id: 'door', position: { x: 400, y: 480 }, size: { x: 370, y: 460, width: 60, height: 40 }, label: 'Door' },
];

// Get desk locations for assigning to agents
export function getDeskLocations(): LocationDef[] {
  return LOCATIONS.filter((l) => l.id === 'desk');
}

// Get a specific location by type (first match)
export function getLocation(type: OfficeLocation): LocationDef | undefined {
  return LOCATIONS.find((l) => l.id === type);
}

// Get all locations of a type
export function getLocationsOfType(type: OfficeLocation): LocationDef[] {
  return LOCATIONS.filter((l) => l.id === type);
}

// Simple waypoint graph for pathfinding
export const WAYPOINTS: Waypoint[] = [
  { id: 'hall-center', position: { x: 400, y: 280 }, connections: ['hall-left', 'hall-right', 'meeting', 'desks-center'] },
  { id: 'hall-left', position: { x: 150, y: 280 }, connections: ['hall-center', 'search', 'coffee', 'desk-1', 'desk-2'] },
  { id: 'hall-right', position: { x: 650, y: 280 }, connections: ['hall-center', 'terminal', 'files', 'whiteboard', 'desk-3', 'desk-4'] },
  { id: 'desks-center', position: { x: 400, y: 180 }, connections: ['hall-center', 'desk-2', 'desk-3'] },
  { id: 'desk-1', position: { x: 120, y: 190 }, connections: ['hall-left'] },
  { id: 'desk-2', position: { x: 250, y: 190 }, connections: ['hall-left', 'desks-center'] },
  { id: 'desk-3', position: { x: 380, y: 190 }, connections: ['desks-center', 'hall-right'] },
  { id: 'desk-4', position: { x: 510, y: 190 }, connections: ['hall-right'] },
  { id: 'terminal', position: { x: 680, y: 140 }, connections: ['hall-right'] },
  { id: 'files', position: { x: 680, y: 260 }, connections: ['hall-right'] },
  { id: 'meeting', position: { x: 370, y: 370 }, connections: ['hall-center'] },
  { id: 'search', position: { x: 130, y: 370 }, connections: ['hall-left'] },
  { id: 'whiteboard', position: { x: 570, y: 370 }, connections: ['hall-right'] },
  { id: 'coffee', position: { x: 60, y: 260 }, connections: ['hall-left'] },
  { id: 'door', position: { x: 400, y: 470 }, connections: ['hall-center'] },
];

// BFS pathfinding between waypoints
export function findPath(fromId: string, toId: string): Point[] {
  if (fromId === toId) return [];

  const visited = new Set<string>();
  const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];
  visited.add(fromId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const waypoint = WAYPOINTS.find((w) => w.id === current.id);
    if (!waypoint) continue;

    for (const neighbor of waypoint.connections) {
      if (neighbor === toId) {
        const fullPath = [...current.path, toId];
        return fullPath.map((id) => {
          const wp = WAYPOINTS.find((w) => w.id === id)!;
          return wp.position;
        });
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, path: [...current.path, neighbor] });
      }
    }
  }

  // Fallback: direct line
  const from = WAYPOINTS.find((w) => w.id === fromId);
  const to = WAYPOINTS.find((w) => w.id === toId);
  if (from && to) return [from.position, to.position];
  return [];
}

// Map office locations to nearest waypoint IDs
export function locationToWaypoint(location: OfficeLocation, index: number = 0): string {
  switch (location) {
    case 'desk':
      return `desk-${index + 1}`;
    case 'terminal':
      return 'terminal';
    case 'file_cabinet':
      return 'files';
    case 'meeting_table':
      return 'meeting';
    case 'search_station':
      return 'search';
    case 'whiteboard':
      return 'whiteboard';
    case 'coffee_machine':
      return 'coffee';
    case 'door':
      return 'door';
  }
}
