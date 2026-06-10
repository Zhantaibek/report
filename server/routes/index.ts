import { Router } from 'express';
import { config } from '../config/index.js';
import authRoutes from './auth.routes.js';
import currencyRatesRoutes from './currency-rates.routes.js';
import reportFormsRoutes from './report-forms.routes.js';
import reportsRoutes from './reports.routes.js';
import dataSourcesRoutes from './data-sources.routes.js';
import usersRoutes from './users.routes.js';
import commissionTariffsRoutes from './commission-tariffs.routes.js';
import tradeClassRulesRoutes from './trade-class-rules.routes.js';
import adminRoutes from './admin.routes.js';

const api = Router();
const base = config.apiBase;

api.use('/auth', authRoutes);
api.use('/currency-rates', currencyRatesRoutes);
api.use('/report-forms', reportFormsRoutes);
api.use('/reports', reportsRoutes);
api.use('/data-sources', dataSourcesRoutes);
api.use('/users', usersRoutes);
api.use('/commission-tariffs', commissionTariffsRoutes);
api.use('/trade-class-rules', tradeClassRulesRoutes);
api.use('/admin', adminRoutes);

export const routes = Router();
routes.use(base, api);
