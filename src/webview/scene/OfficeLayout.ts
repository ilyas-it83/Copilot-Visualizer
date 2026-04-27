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

// Office dimensions: 1000x600 logical units (expanded for better space usage)
export const OFFICE_WIDTH = 1000;
export const OFFICE_HEIGHT = 600;

export const LOCATIONS: LocationDef[] = [
  // Top zone (y: 50-200): 6 desks spread wide
  { id: 'desk', position: { x: 80, y: 120 }, size: { x: 55, y: 95, width: 80, height: 50 }, label: 'Desk 1' },
  { id: 'desk', position: { x: 220, y: 120 }, size: { x: 195, y: 95, width: 80, height: 50 }, label: 'Desk 2' },
  { id: 'desk', position: { x: 360, y: 120 }, size: { x: 335, y: 95, width: 80, height: 50 }, label: 'Desk 3' },
  { id: 'desk', position: { x: 540, y: 120 }, size: { x: 515, y: 95, width: 80, height: 50 }, label: 'Desk 4' },
  { id: 'desk', position: { x: 680, y: 120 }, size: { x: 655, y: 95, width: 80, height: 50 }, label: 'Desk 5' },
  { id: 'desk', position: { x: 820, y: 120 }, size: { x: 795, y: 95, width: 80, height: 50 }, label: 'Desk 6' },

  // Middle-left zone (y: 220-350): Terminal, Search
  { id: 'terminal', position: { x: 100, y: 280 }, size: { x: 65, y: 250, width: 100, height: 70 }, label: 'Terminal' },
  { id: 'search_station', position: { x: 260, y: 280 }, size: { x: 230, y: 255, width: 90, height: 60 }, label: 'Search' },

  // Middle-right zone (y: 220-350): File cabinet, Whiteboard
  { id: 'file_cabinet', position: { x: 780, y: 270 }, size: { x: 755, y: 245, width: 80, height: 60 }, label: 'Files' },
  { id: 'whiteboard', position: { x: 900, y: 260 }, size: { x: 880, y: 240, width: 90, height: 80 }, label: 'Whiteboard' },

  // Bottom-left (y: 400-530): Coffee booth, Water cooler — inside Pantry
  { id: 'coffee_machine', position: { x: 80, y: 470 }, size: { x: 50, y: 440, width: 70, height: 55 }, label: 'Coffee' },
  { id: 'water_cooler', position: { x: 200, y: 470 }, size: { x: 180, y: 445, width: 50, height: 55 }, label: 'Water' },

  // Bottom-center (y: 400-530): Meeting table centered in Meeting Room
  { id: 'meeting_table', position: { x: 480, y: 470 }, size: { x: 410, y: 430, width: 180, height: 100 }, label: 'Meeting' },

  // Bottom-right (y: 400-530): Washroom
  { id: 'washroom', position: { x: 880, y: 470 }, size: { x: 855, y: 445, width: 70, height: 60 }, label: 'WC' },

  // Bottom edge: Door/entrance
  { id: 'door', position: { x: 500, y: 575 }, size: { x: 470, y: 555, width: 60, height: 40 }, label: 'Door' },
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

// Waypoint graph for pathfinding — all locations connected via corridors
export const WAYPOINTS: Waypoint[] = [
  // Main corridors
  { id: 'corridor-top', position: { x: 500, y: 200 }, connections: ['corridor-left', 'corridor-right', 'corridor-center', 'desk-3', 'desk-4'] },
  { id: 'corridor-left', position: { x: 180, y: 280 }, connections: ['corridor-top', 'corridor-center', 'corridor-bottom-left', 'desk-1', 'desk-2', 'terminal', 'search'] },
  { id: 'corridor-right', position: { x: 820, y: 280 }, connections: ['corridor-top', 'corridor-center', 'corridor-bottom-right', 'desk-5', 'desk-6', 'files', 'whiteboard'] },
  { id: 'corridor-center', position: { x: 500, y: 360 }, connections: ['corridor-top', 'corridor-left', 'corridor-right', 'corridor-bottom-left', 'corridor-bottom-center', 'corridor-bottom-right'] },

  // Bottom corridors
  { id: 'corridor-bottom-left', position: { x: 180, y: 450 }, connections: ['corridor-left', 'corridor-center', 'coffee', 'water_cooler'] },
  { id: 'corridor-bottom-center', position: { x: 500, y: 450 }, connections: ['corridor-center', 'corridor-bottom-left', 'corridor-bottom-right', 'meeting', 'door'] },
  { id: 'corridor-bottom-right', position: { x: 880, y: 450 }, connections: ['corridor-right', 'corridor-center', 'corridor-bottom-center', 'washroom'] },

  // Desk waypoints
  { id: 'desk-1', position: { x: 80, y: 170 }, connections: ['corridor-left'] },
  { id: 'desk-2', position: { x: 220, y: 170 }, connections: ['corridor-left'] },
  { id: 'desk-3', position: { x: 360, y: 170 }, connections: ['corridor-top'] },
  { id: 'desk-4', position: { x: 540, y: 170 }, connections: ['corridor-top'] },
  { id: 'desk-5', position: { x: 680, y: 170 }, connections: ['corridor-right'] },
  { id: 'desk-6', position: { x: 820, y: 170 }, connections: ['corridor-right'] },

  // Location waypoints
  { id: 'terminal', position: { x: 100, y: 310 }, connections: ['corridor-left'] },
  { id: 'search', position: { x: 260, y: 310 }, connections: ['corridor-left'] },
  { id: 'files', position: { x: 780, y: 300 }, connections: ['corridor-right'] },
  { id: 'whiteboard', position: { x: 900, y: 290 }, connections: ['corridor-right'] },
  { id: 'coffee', position: { x: 80, y: 470 }, connections: ['corridor-bottom-left'] },
  { id: 'water_cooler', position: { x: 200, y: 470 }, connections: ['corridor-bottom-left'] },
  { id: 'meeting', position: { x: 500, y: 490 }, connections: ['corridor-bottom-center'] },
  { id: 'washroom', position: { x: 880, y: 490 }, connections: ['corridor-bottom-right'] },
  { id: 'door', position: { x: 500, y: 565 }, connections: ['corridor-bottom-center'] },
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
    case 'water_cooler':
      return 'water_cooler';
    case 'washroom':
      return 'washroom';
    case 'door':
      return 'door';
  }
}
