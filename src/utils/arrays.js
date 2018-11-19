module.exports = {
    /*
    * fills an empty array from 0 to max with integers and then returns the new array.
    * */
    fillRange: function (max) {
        return Array.apply(null, {length: max}).map(Number.call, Number);
    },

    /*
    * Returns the longest string within a given array. It does not return the actual length
    * of the longest item, just the longest item.
    * */
    longest: function (arr) {
        return arr.reduce((a, b) => {
           return a.length > b.length ? a : b;
        });
    },

    /*
    * Get the previous element of an array, this method is created for safety, if the
    * given index is zero or less than zero, the function will return the element at zero
    * rather than undefined. * */
    getPrevious: function(index, data) {
        return index <= 0 ? data[0] : data[index - 1];
    },

    /*
    * Get the next element of an array, this method is also a safety wrapper function, if the
    * given index is equal to the length of the array - 1, or larger, return the last element
     * of the array, rather than undefined. * */
    getNext: function(index, data) {
        return index >= data.length - 1 ? data[data.length - 1] : data[index + 1];
    },

    /*
    * Get all only negative values from a given array.
    * */
    negativeValues: function (array) {
        return array.filter(function(value) {
            return value < 0;
        });
    },

    /*
   * Get all only positive () values from a given array.
   * */
    positiveAndZeroValues: function (array) {
        return array.filter(function(value) {
            return value >= 0;
        });
    },

    /*
     check if a value is within the given array
    * */
    join(arrA, arrB) {
        return arrA.concat(arrB)
    }
};