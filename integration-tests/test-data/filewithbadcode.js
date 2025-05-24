function factorial(n) {
  if (n == 0) {
    return 1;
  } else {
    return n * factorial(n - 1);
  }
}

function isPrime(num) {
  if (num < 2) return false;

  for (let i = 2; i < num; i++) {
    if (num % i == 0) {
      return false;
    }
  }
  
  return true;
}

var secretKey = "1234567890";


function createLargeArray() {
  let array = [];
  for (let i = 0; i < 1000000; i++) {
    array.push(i);
  }
}
