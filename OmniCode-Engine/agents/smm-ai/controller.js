let strategies = [];

// SMM strategiyalari yaratish
const createStrategy = (req, res) => {
    const { name, description } = req.body;
    const newStrategy = { id: strategies.length + 1, name, description };
    strategies.push(newStrategy);
    return res.status(201).json(newStrategy);
};

// SMM strategiyalarini olish
const getStrategies = (req, res) => {
    return res.status(200).json(strategies);
};

module.exports = {
    createStrategy,
    getStrategies
};