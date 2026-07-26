class SMMStrategy {
    constructor(name, description) {
        this.name = name;
        this.description = description;
        this.id = SMMStrategy.incrementId();
    }

    static incrementId() {
        if (!this.idCounter) this.idCounter = 0;
        return ++this.idCounter;
    }
}

module.exports = SMMStrategy;