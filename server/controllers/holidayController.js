import axios from 'axios';

export const getHolidays = async (req, res) => {
    const year = req.query.year || new Date().getFullYear();

    try {
        // 1. Fetch National Holidays from Brasil API
        const response = await axios.get(`https://brasilapi.com.br/api/feriados/v1/${year}`);
        const nationalHolidays = response.data;

        // 2. Define Amapá State Holidays
        const amapaHolidays = [
            {
                date: `${year}-03-19`,
                name: 'Dia de São José (Padroeiro do Amapá)',
                type: 'state'
            },
            {
                date: `${year}-09-13`,
                name: 'Criação do Território Federal do Amapá',
                type: 'state'
            },
            {
                date: `${year}-10-05`,
                name: 'Criação do Estado do Amapá',
                type: 'state'
            }
        ];

        // 3. Merge and Normalize
        // Map national holidays to a common format
        const formattedNational = nationalHolidays.map(h => ({
            date: h.date,
            name: h.name,
            type: 'national'
        }));

        // Combine both
        const allHolidays = [...formattedNational, ...amapaHolidays];

        // Sort by date
        allHolidays.sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json(allHolidays);
    } catch (error) {
        console.error('Erro ao buscar feriados:', error.message);
        res.status(500).json({ error: 'Erro ao buscar feriados' });
    }
};
