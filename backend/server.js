require('dotenv').config(); // Load environment variables from .env file
const app = require('./src/app'); // Import the Express app
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
