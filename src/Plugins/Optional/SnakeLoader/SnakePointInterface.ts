// define point interface with the following properties:
// symbol: string, can be ither * or space
// turnpoint: a digit representing a direction change, limited to the following values:
// 0 is no turn, 1 is left, 2 is right, 3 is up, 4 is down
// example: {symbol: '*', turnpoint: 0} is a point with no turn
// example: {symbol: ' ', turnpoint: 1} is a point with a left turn
export interface SnakePoint {
  symbol: "*" | " " | "■";
  turnpoint: 0 | 1 | 2 | 3 | 4;
}
