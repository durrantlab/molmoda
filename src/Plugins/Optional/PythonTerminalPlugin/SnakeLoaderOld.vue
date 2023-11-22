<template>
  <div class="snake-loader">
    <div class="snake">
      <!-- ASCII art of a snake -->
      <pre>
        Loading...
      </pre>
    </div>
  </div>
</template>

<style scoped>
.snake-loader {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
}

.snake {
  /* Styling for your snake ASCII art */
  color: green;
  font-size: 24px;
}

/* Add CSS animations here for the snake */
@keyframes snakeChase {
  0% {
    /* Initial position */
    transform: translateX(0);
  }
  100% {
    /* Final position (chasing its tail) */
    transform: translateX(100%);
  }
}

/* Apply the animation to the snake element */
.snake {
  animation: snakeChase 2s linear infinite;
}
</style>
