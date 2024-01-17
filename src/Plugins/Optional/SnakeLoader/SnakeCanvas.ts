interface Point {
  x: number;
  y: number;
}

// symbol: string, can be ither * or space
// turnpoint: a digit representing a direction change, limited to the following values:
// 0 is no turn, 1 is left, 2 is right, 3 is up, 4 is down
// example: {symbol: '*', turnpoint: 0} is a point with no turn
// example: {symbol: ' ', turnpoint: 1} is a point with a left turn
export interface SnakePoint {
  symbol: "*" | " " | "■";
  turnpoint: 0 | 1 | 2 | 3 | 4;
}

export class SnakeCanvas {
  private canvasWidth: number;
  private canvasLength: number;
  private canvas: SnakePoint[][];
  private snakeCoordinates: Point[];
  private snakeLength: number;
  private snakeHead: Point;
  private magicNumber: number;
  /*
   * class constructor
   * @param {number} canvasWidth - width of the canvas
   * @param {number} canvasLength - length of the canvas
   * @param {number} symbol - symbol of the snake
   */
  constructor(canvasWidth: number, canvasLength: number, snakeLength: number) {
    this.canvasWidth = canvasWidth;
    this.canvasLength = canvasLength;
    this.canvas = [];
    this.snakeCoordinates = [];
    this.snakeLength = snakeLength;
    this.snakeHead = { x: 0, y: 0 };
    this.magicNumber = 0.09;

    this.populateCanvas();
    this.placeSnake();
  }

  private populateCanvas() {
    for (let i = 0; i < this.canvasLength; i++) {
      this.canvas.push([]);
      for (let j = 0; j < this.canvasWidth; j++) {
        this.canvas[i].push({
          symbol: Math.random() < this.magicNumber ? "*" : " ",
          turnpoint:
            Math.random() < this.magicNumber
              ? 0
              : Math.random() < this.magicNumber
                ? 1
                : Math.random() < this.magicNumber
                  ? 2
                  : Math.random() < this.magicNumber
                    ? 3
                    : 4,
        });
      }
    }
  }

  private getRandomCoordinate(): { x: number; y: number } {
    const x = Math.floor(Math.random() * this.canvasWidth);
    const y = Math.floor(Math.random() * this.canvasLength);
    return { x, y };
  }

  private placeSnake() {
    const startCoord = this.getRandomCoordinate();
    this.snakeHead = { ...this.snakeHead, x: startCoord.x, y: startCoord.y };
    this.snakeCoordinates.push({ ...this.snakeHead });

    // for (let i = 1; i < this.snakeLength; i++) {

    // const coord = this.getRandomCoordinate();
    //      this.snakeCoordinates.push({ symbol: "■", turnpoint: 0, ...coord });
    // this.snakeCoordinates.push({ ...coord });
    // }
  }

  public updateCanvas() {
    // Logic to update the canvas and snake position
    // Add collision detection and snake growth logic here
    this.snakeHead.x += 1;
  }

  drawCanvas(): string {
    let canvasString = "";
    for (let i = 0; i < this.canvasLength; i++) {
      for (let j = 0; j < this.canvasWidth; j++) {
        const point = this.canvas[i][j];
        canvasString += point.symbol;
      }
      canvasString += "\n";
    }
    canvasString =
      "                                                                                \n";
    canvasString +=
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "              ***                                                               \n";
    canvasString =
      "              *   *                                                             \n";
    canvasString =
      "              *   *  *                                                          \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";
    canvasString =
      "                                                                                \n";

    return canvasString;
  }
}
