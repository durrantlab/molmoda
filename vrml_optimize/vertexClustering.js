// vertexClustering.js

// Improved Mesh simplification using Vertex Clustering with color preservation

function simplifyMesh(vertices, indices, colors, targetVertexCount) {
    console.log(`Starting simplification. Target vertex count: ${targetVertexCount}`);
  
    // Find bounding box
    const bbox = findBoundingBox(vertices);
    console.log('Bounding box:', bbox);
    if (!isValidBoundingBox(bbox)) {
      console.error('Invalid bounding box. Cannot proceed with simplification.');
      return { vertices, indices, colors };
    }

    const GRID_FACTOR_CHANGE = 1.05
  
    // Calculate initial grid size
    let initialGridSize = Math.ceil(Math.cbrt(vertices.length / targetVertexCount) * 10); // Multiply by 10 for finer grid
    let gridSize = initialGridSize;
    console.log('Initial grid size:', gridSize);
    let newVertices, newIndices, newColors;
    let iteration = 0;
    do {
      iteration++;
      console.log(`\nIteration ${iteration}, Grid size: ${gridSize}`);
      // Create grid and assign vertices to cells
      const grid = createGrid(vertices, colors, bbox, gridSize);
      console.log('Number of non-empty cells:', Object.keys(grid).length);
      // Compute representative vertices for each cell
      const result = computeRepresentativeVertices(grid);
      newVertices = result.newVertices;
      newColors = result.newColors;
      // Create mapping from old vertex indices to new ones
      const vertexMapping = createVertexMapping(grid);
      // Update face indices
      newIndices = updateIndices(indices, vertexMapping);
      console.log(`Current vertices: ${newVertices.length}, Target: ${targetVertexCount}`);
      // Adjust grid size if necessary
      if (newVertices.length > targetVertexCount) {
        // Too many vertices, need to cluster more by decreasing gridSize
        gridSize = Math.floor(gridSize / GRID_FACTOR_CHANGE);
        if (gridSize < 1) gridSize = 1;
      } else if (newVertices.length < targetVertexCount * 0.9) {
        // Too few vertices, need to cluster less by increasing gridSize
        gridSize = Math.ceil(gridSize * GRID_FACTOR_CHANGE);
      } else {
        break;
      }
    } while (iteration < 20); // Set a maximum number of iterations to prevent infinite loops
    console.log(`Simplification complete. New vertex count: ${newVertices.length}`);
    return { vertices: newVertices, indices: newIndices, colors: newColors };
  }
  
  function findBoundingBox(vertices) {
    if (vertices.length === 0) {
      console.error('No vertices provided to findBoundingBox');
      return null;
    }
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (const vertex of vertices) {
      if (vertex.length !== 3) {
        console.error('Invalid vertex:', vertex);
        continue;
      }
      const [x, y, z] = vertex;
      if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
        console.error('Invalid vertex coordinates:', vertex);
        continue;
      }
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }
    return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
  }
  
  function isValidBoundingBox(bbox) {
    if (!bbox || !bbox.min || !bbox.max) return false;
    return bbox.min.every(isFinite) && bbox.max.every(isFinite);
  }
  
  function createGrid(vertices, colors, bbox, gridSize) {
    const grid = {};
    const cellSize = [
      (bbox.max[0] - bbox.min[0]) / gridSize,
      (bbox.max[1] - bbox.min[1]) / gridSize,
      (bbox.max[2] - bbox.min[2]) / gridSize
    ];
    console.log('Cell size:', cellSize);
    if (!cellSize.every(isFinite)) {
      console.error('Invalid cell size:', cellSize);
      return grid;
    }
  
    function colorKey(color) {
      return color.map(c => Math.round(c * 255)).join(',');
    }
  
    vertices.forEach((vertex, index) => {
      if (vertex.length !== 3) {
        console.error('Invalid vertex:', vertex);
        return;
      }
      const cellX = Math.floor((vertex[0] - bbox.min[0]) / cellSize[0]);
      const cellY = Math.floor((vertex[1] - bbox.min[1]) / cellSize[1]);
      const cellZ = Math.floor((vertex[2] - bbox.min[2]) / cellSize[2]);
      if (!isFinite(cellX) || !isFinite(cellY) || !isFinite(cellZ)) {
        console.error('Invalid cell coordinates:', cellX, cellY, cellZ);
        return;
      }
      const color = colors[index];
      const cellColorKey = colorKey(color);
      const cellKey = `${cellX},${cellY},${cellZ},${cellColorKey}`;
      if (!grid[cellKey]) {
        grid[cellKey] = [];
      }
      grid[cellKey].push({ index, position: vertex, color });
    });
    return grid;
  }
  
  function computeRepresentativeVertices(grid) {
    const newVertices = [];
    const newColors = [];
    let newIndex = 0;
    for (const cellKey in grid) {
      const cell = grid[cellKey];
      const avgVertex = [0, 0, 0];
      const avgColor = [0, 0, 0];
      for (const vertex of cell) {
        avgVertex[0] += vertex.position[0];
        avgVertex[1] += vertex.position[1];
        avgVertex[2] += vertex.position[2];
        avgColor[0] += vertex.color[0];
        avgColor[1] += vertex.color[1];
        avgColor[2] += vertex.color[2];
      }
      avgVertex[0] /= cell.length;
      avgVertex[1] /= cell.length;
      avgVertex[2] /= cell.length;
      avgColor[0] /= cell.length;
      avgColor[1] /= cell.length;
      avgColor[2] /= cell.length;
      newVertices.push(avgVertex);
      newColors.push(avgColor);
      // Assign new index to each vertex in the cell
      cell.newIndex = newIndex++;
    }
    return { newVertices, newColors };
  }
  
  function createVertexMapping(grid) {
    const mapping = {};
    for (const cellKey in grid) {
      const cell = grid[cellKey];
      for (const vertex of cell) {
        mapping[vertex.index] = cell.newIndex;
      }
    }
    return mapping;
  }
  
  function updateIndices(oldIndices, vertexMapping) {
    const newIndices = [];
    const uniqueFaces = new Set();
    for (let i = 0; i < oldIndices.length; i += 4) {
      if (oldIndices[i] === -1) continue; // Skip degenerate faces
      const face = [
        vertexMapping[oldIndices[i]],
        vertexMapping[oldIndices[i + 1]],
        vertexMapping[oldIndices[i + 2]]
      ];
      // Only add the face if all vertices are different
      if (new Set(face).size === 3) {
        const sortedFace = [...face].sort((a, b) => a - b);
        const faceKey = sortedFace.join(',');
        if (!uniqueFaces.has(faceKey)) {
          newIndices.push(...face, -1);
          uniqueFaces.add(faceKey);
        }
      }
    }
    return newIndices;
  }
  
  module.exports = {
    simplifyMesh
  };
  