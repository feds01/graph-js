/*
 * fills an empty array from 0 to max with integers and then returns the new array.
 * */
export function fillRange(max) {
  return Array.from(Array(max).keys());
}

/*
 * Returns the longest string within a given array. It does not return the actual length
 * of the longest item, just the longest item.
 * */
export function longest(arr) {
  return arr.reduce((a, b) => {
    return a.toString().length > b.toString().length ? a : b;
  });
}

/*
 * Get the previous element of an array, this method is created for safety, if the
 * given index is zero or less than zero, the function will return the element at zero
 * rather than undefined. * */
export function getPrevious(index, data) {
  return index <= 0 ? data[0] : data[index - 1];
}

/*
 * Get the next element of an array, this method is also a safety wrapper function, if the
 * given index is equal to the length of the array - 1, or larger, return the last element
 * of the array, rather than undefined. * */
export function getNext(index, data) {
  return index >= data.length - 1 ? data[data.length - 1] : data[index + 1];
}

/*
 * Get all only negative values from a given array.
 * */
export function negativeValues(array) {
  return array.filter(function (value) {
    return value < 0;
  });
}

/*
    // Get all unique values from a given array.
    */
export function uniqueValues(array) {
  return new Set(array);
}

/**
 * Function to get maximum element within array, we don't want to
 * use Math.max if it is a large array
 */
export function getMax(arr) {
  let len = arr.length;
  let max = -Infinity;

  while (len--) {
    max = arr[len] > max ? arr[len] : max;
  }
  return max;
}

/**
 * Function to get maximum element within array, we don't want to
 * use Math.max if it is a large array
 */
export function getMin(arr) {
  let len = arr.length;
  let min = Infinity;

  while (len--) {
    min = arr[len] < min ? arr[len] : min;
  }
  return min;
}

export function getMinMax(arr) {
  let min = arr[0];
  let max = arr[0];
  let i = arr.length;

  while (i--) {
    min = arr[i] < min ? arr[i] : min;
    max = arr[i] > max ? arr[i] : max;
  }
  return { min, max };
}

/*
    // Get all only positive and zero values from a given array.
    */
export function positiveAndZeroValues(array) {
  return array.filter((value) => value >= 0);
}
