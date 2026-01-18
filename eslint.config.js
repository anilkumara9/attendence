const expo = require('eslint-config-expo');

module.exports = [
    ...expo,
    {
        rules: {
            'no-unused-vars': 'warn',
        },
    },
];
