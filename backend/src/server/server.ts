import express from 'express';
import cors from 'cors';
import path from 'path';
import { routes } from './routes';

export const app = express();

app.use(cors());
app.use(express.json());

// Serve static screenshots from the backend folder
app.use('/screenshots', express.static(path.resolve(__dirname, '../../screenshots')));

app.use('/api', routes);
