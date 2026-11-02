export default class MovieQueue {
    constructor() {
        this.elements = [];
    }
    enqueue(element) {
        this.elements.push(element);
    }
    dequeue() {
        return this.elements.shift();
    }
    peek() {
        return this.elements[0];
    }
    queue() {
        return this.elements;
    }
    remove(position) {
        return this.elements.splice(position, 1);
    }
    sort() {
        this.elements.sort((movie1, movie2) => {
            return movie2.popularity - movie1.popularity;
        });
    }
    get(position) {
        return this.elements[position];
    }
    clear() {
        while (!this.isEmpty) {
            this.elements.shift()
        }
    }
    get length() {
        return this.elements.length;
    }
    get isEmpty() {
        return this.elements.length === 0;
    }
}