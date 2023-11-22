<template>
  <div class="snake-loader">
    <div class="snake">
      <pre>{{ canvasString }}</pre>
    </div>
  </div>
</template>

<script>
import { Vue } from "vue-class-component";
import { SnakeCanvas } from "@/Plugins/Optional/SnakeLoader/SnakeCanvas";

export default class SnakeLoader extends Vue {
  snakePosition = 0;
  snakeRow = 0;
  snakeLength = 10; // Initial snake length
  canvasWidth = 80;
  canvasHeight = 20;
  canvasString = "";
  // define a two dimentional array snakeCanvas of SnakePointInterface type with the width of this.canvasWidth and the length of this.canvasLength
  snakeCanvas = new SnakeCanvas(
    this.canvasWidth,
    this.canvasHeight,
    this.snakeLength
  );
  created() {
    this.canvasString = this.snakeCanvas.drawCanvas();
    // on timeout call this.snakeCanvas.updateCanvas()
    () => {
      this.snakeCanvas.updateCanvas();
      this.canvasString = this.snakeCanvas.drawCanvas();
    },
      1000;
  }

  generateRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  initializeCanvas() {
    // Randomly fill the canvas with objects {symbol: "", turnpoint: bool}, where symbols is either * or a space and turnpoint is either true or false
    for (let i = 0; i < this.canvasWidth * this.canvasHeight; i++)
      this.snakeCanvas.push({
        symbol: Math.random() < 0.0091 ? "*" : " ",
        turnpoint: Math.random() < 0.2 ? true : false,
      });
  }

  drawInitialSnake() {
    this.snakeRow = this.generateRandomNumber(0, this.canvasHeight - 1);
    // Draw the initial snake
    for (let i = 0; i < this.snakeLength; i++) {
      this.snakeCanvas[i * this.snakeRow].symbol = "*";
    }
  }

  drawCanvas() {
    // Draw the initial canvas
    if (!this.canvasInitialized) {
      this.canvasInitialized = true;
      let canvas = "";
      for (let i = 0; i < this.canvasWidth * this.canvasHeight; i++) {
        canvas += this.snakeCanvas[i].symbol;
        if (i % this.canvasWidth === 0) {
          canvas += "\n";
        }
      }
      return canvas;
    }
    // Draw the canvas after snake has moved
    else {
      let canvas = "";
      for (let i = 0; i < this.canvasWidth * this.canvasHeight; i++) {
        canvas += this.snakeCanvas[i].symbol;
        if (i % this.canvasWidth === 0) {
          canvas += "\n";
        }
      }
      return canvas;
    }
  }

  updateSnakeCanvas() {
    this.snakeCanvas = [];
    for (let i = 0; i < this.canvasWidth; i++) {
      if (i === this.snakePosition) {
        this.snakeCanvas.push("█"); // Snake head
      } else if (i < this.snakeLength) {
        this.snakeCanvas.push("*"); // Snake body
      } else {
        // Randomly place * or empty space
        this.snakeCanvas.push(Math.random() < 0.2 ? "*" : " ");
      }
    }
  }

  makeRandomTurn() {
    // going right is 0, going down is 1, going left is 2, going up - yes, you nailed it!
    // now, going right is clear - we just increment snakePosition
    // going lefit is also clear - we just decrement snakePosition
    // going down is trickier. We have to find the next line is canvasWidth
  }

  moveSnake() {
    // if (!this.canvasInitialized) {
    //   return;
    // }
    setInterval(() => {
      // Move the snake
      if (!this.eating) {
        this.snakePosition++;
        if (this.snakePosition >= this.canvasWidth) {
          this.snakePosition = 0;
          this.snakeRow++;
          this.snakeCanvas[this.snakePosition * this.snakeRow].symbol = "*";
          if (this.snakeRow >= this.canvasHeight) {
            this.snakeRow = 0;
          }
        }
        this.snakeCanvas[
          (this.snakePosition - this.snakeLength) * this.snakeRow
        ].symbol = " ";
      }
      // Check for collision with asterisk
      if (this.snakeCanvas[this.snakePosition + 1].symbol === "*") {
        this.snakeLength++;
        this.eating = true;
        setTimeout(() => {
          this.eating = false;
        }, 500); // Delay before snake can eat again
      }
      // Update the snake canvas
      this.drawCanvas();
    }, 200); // Adjust snake speed as needed
    // debugger;
  }
}
</script>

<style scoped>
.snake-loader {
  font-family: monospace;
  font-size: 1.5rem;
  color: #fff;
  background-color: #000;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow: hidden;
  width: 100%;
  height: 100%;
}
</style>
