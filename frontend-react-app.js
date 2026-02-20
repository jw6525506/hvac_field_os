// HVAC Field OS - Frontend React Application
// React + Redux + Tailwind CSS

// ============================================================================
// PACKAGE.JSON - Frontend Dependencies
// ============================================================================

/*
{
  "name": "hvac-field-os-frontend",
  "version": "1.0.0",
  "description": "HVAC Field OS Web & Mobile App",
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "redux": "^5.0.0",
    "react-redux": "^9.0.0",
    "@reduxjs/toolkit": "^2.0.0",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0",
    "react-calendar": "^4.6.0",
    "recharts": "^2.10.0",
    "react-toastify": "^9.1.3",
    "tailwindcss": "^3.3.6"
  }
}
*/

// ============================================================================
// APP STRUCTURE
// ============================================================================

// src/
//   ├── components/
//   │   ├── Dashboard/
//   │   ├── Dispatch/
//   │   ├── WorkOrders/
//   │   ├── Customers/
//   │   ├── Inventory/
//   │   ├── Invoicing/
//   │   └── Shared/
//   ├── services/
//   │   └── api.js
//   ├── store/
//   │   ├── slices/
//   │   └── store.js
//   ├── utils/
//   └── App.js

// ============================================================================
// API SERVICE (services/api.js)
// ============================================================================

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Work Orders API
export const workOrdersAPI = {
  getAll: (params) => api.get('/work-orders', { params }),
  getById: (id) => api.get(`/work-orders/${id}`),
  create: (data) => api.post('/work-orders', data),
  update: (id, data) => api.put(`/work-orders/${id}`, data),
  complete: (id, data) => api.post(`/work-orders/${id}/complete`, data),
  delete: (id) => api.delete(`/work-orders/${id}`)
};

// Customers API
export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  getEquipment: (id) => api.get(`/customers/${id}/equipment`)
};

// Inventory API
export const inventoryAPI = {
  getAll: (params) => api.get('/inventory', { params }),
  getById: (id) => api.get(`/inventory/${id}`),
  create: (data) => api.post('/inventory', data),
  update: (id, data) => api.put(`/inventory/${id}`, data),
  getTruckStock: (technicianId) => api.get(`/inventory/truck-stock/${technicianId}`),
  updateTruckStock: (technicianId, data) => api.post(`/inventory/truck-stock/${technicianId}`, data)
};

// Invoices API
export const invoicesAPI = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  send: (id) => api.post(`/invoices/${id}/send`),
  recordPayment: (id, data) => api.post(`/invoices/${id}/payments`, data),
  syncToQuickBooks: (id) => api.post(`/invoices/${id}/sync-quickbooks`)
};

// Dispatch API
export const dispatchAPI = {
  getTodaysSchedule: () => api.get('/dispatch/today'),
  assignTechnician: (workOrderId, technicianId) => 
    api.post(`/dispatch/assign`, { workOrderId, technicianId }),
  optimizeRoutes: (date) => api.post('/dispatch/optimize-routes', { date })
};

export default api;

// ============================================================================
// REDUX STORE SETUP
// ============================================================================

import { configureStore } from '@reduxjs/toolkit';
import workOrdersReducer from './slices/workOrdersSlice';
import customersReducer from './slices/customersSlice';
import inventoryReducer from './slices/inventorySlice';
import invoicesReducer from './slices/invoicesSlice';

export const store = configureStore({
  reducer: {
    workOrders: workOrdersReducer,
    customers: customersReducer,
    inventory: inventoryReducer,
    invoices: invoicesReducer
  }
});

// ============================================================================
// WORK ORDERS SLICE (store/slices/workOrdersSlice.js)
// ============================================================================

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { workOrdersAPI } from '../../services/api';

export const fetchWorkOrders = createAsyncThunk(
  'workOrders/fetchAll',
  async (params) => {
    const response = await workOrdersAPI.getAll(params);
    return response.data;
  }
);

export const createWorkOrder = createAsyncThunk(
  'workOrders/create',
  async (workOrderData) => {
    const response = await workOrdersAPI.create(workOrderData);
    return response.data;
  }
);

export const completeWorkOrder = createAsyncThunk(
  'workOrders/complete',
  async ({ id, data }) => {
    const response = await workOrdersAPI.complete(id, data);
    return response.data;
  }
);

const workOrdersSlice = createSlice({
  name: 'workOrders',
  initialState: {
    items: [],
    selectedWorkOrder: null,
    loading: false,
    error: null
  },
  reducers: {
    selectWorkOrder: (state, action) => {
      state.selectedWorkOrder = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchWorkOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchWorkOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(createWorkOrder.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(completeWorkOrder.fulfilled, (state, action) => {
        const index = state.items.findIndex(wo => wo.id === action.payload.workOrder.id);
        if (index !== -1) {
          state.items[index] = action.payload.workOrder;
        }
      });
  }
});

export const { selectWorkOrder } = workOrdersSlice.actions;
export default workOrdersSlice.reducer;

// ============================================================================
// DASHBOARD COMPONENT
// ============================================================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWorkOrders } from '../store/slices/workOrdersSlice';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const Dashboard = () => {
  const dispatch = useDispatch();
  const [stats, setStats] = useState({
    todaysJobs: 0,
    completedToday: 0,
    revenue: 0,
    marginWarnings: 0
  });

  useEffect(() => {
    // Fetch today's work orders
    const today = new Date().toISOString().split('T')[0];
    dispatch(fetchWorkOrders({ startDate: today, endDate: today }));
  }, [dispatch]);

  const workOrders = useSelector(state => state.workOrders.items);

  useEffect(() => {
    // Calculate stats
    const todaysJobs = workOrders.length;
    const completedToday = workOrders.filter(wo => wo.status === 'completed').length;
    const revenue = workOrders
      .filter(wo => wo.status === 'completed')
      .reduce((sum, wo) => sum + parseFloat(wo.actualCost || 0) * 1.3, 0);
    const marginWarnings = workOrders.filter(wo => wo.estimatedMargin < 20).length;

    setStats({ todaysJobs, completedToday, revenue, marginWarnings });
  }, [workOrders]);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Today's Jobs" value={stats.todaysJobs} color="blue" />
        <StatCard title="Completed Today" value={stats.completedToday} color="green" />
        <StatCard title="Today's Revenue" value={`$${stats.revenue.toFixed(0)}`} color="purple" />
        <StatCard 
          title="Margin Warnings" 
          value={stats.marginWarnings} 
          color={stats.marginWarnings > 0 ? "red" : "green"} 
        />
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Today's Schedule</h2>
        <div className="space-y-3">
          {workOrders.map(wo => (
            <WorkOrderCard key={wo.id} workOrder={wo} />
          ))}
        </div>
      </div>

      {/* Revenue Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Weekly Revenue</h2>
        <BarChart width={800} height={300} data={revenueData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="day" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="revenue" fill="#8884d8" />
        </BarChart>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500'
  };

  return (
    <div className={`${colorClasses[color]} text-white rounded-lg shadow p-6`}>
      <h3 className="text-sm font-medium opacity-80">{title}</h3>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </div>
  );
};

const WorkOrderCard = ({ workOrder }) => {
  const statusColors = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800'
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{workOrder.workOrderNumber}</h3>
          <p className="text-sm text-gray-600">{workOrder.Customer?.businessName || 
            `${workOrder.Customer?.firstName} ${workOrder.Customer?.lastName}`}</p>
          <p className="text-xs text-gray-500 mt-1">{workOrder.description}</p>
        </div>
        <div className="text-right">
          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[workOrder.status]}`}>
            {workOrder.status.replace('_', ' ').toUpperCase()}
          </span>
          <p className="text-sm text-gray-600 mt-2">
            {new Date(workOrder.scheduledStart).toLocaleTimeString('en-US', { 
              hour: 'numeric', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>
      {workOrder.estimatedMargin < 20 && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded p-2">
          <p className="text-xs text-red-700">⚠️ Low margin warning: {workOrder.estimatedMargin}%</p>
        </div>
      )}
    </div>
  );
};

// Sample data for chart
const revenueData = [
  { day: 'Mon', revenue: 4200 },
  { day: 'Tue', revenue: 3800 },
  { day: 'Wed', revenue: 5100 },
  { day: 'Thu', revenue: 4700 },
  { day: 'Fri', revenue: 6200 },
  { day: 'Sat', revenue: 3900 },
  { day: 'Sun', revenue: 2100 }
];

export default Dashboard;

// ============================================================================
// DISPATCH BOARD COMPONENT
// ============================================================================

import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { dispatchAPI } from '../services/api';

const DispatchBoard = () => {
  const [technicians, setTechnicians] = useState([]);
  const [unassignedJobs, setUnassignedJobs] = useState([]);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    const response = await dispatchAPI.getTodaysSchedule();
    setTechnicians(response.data.technicians);
    setUnassignedJobs(response.data.unassigned);
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const workOrderId = parseInt(draggableId);
    const technicianId = destination.droppableId.replace('tech-', '');

    // Assign technician
    await dispatchAPI.assignTechnician(workOrderId, technicianId);
    loadSchedule();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dispatch Board</h1>
        <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Optimize Routes
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Unassigned Column */}
          <Droppable droppableId="unassigned">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="bg-gray-100 rounded-lg p-4"
              >
                <h2 className="font-semibold mb-4">Unassigned ({unassignedJobs.length})</h2>
                {unassignedJobs.map((job, index) => (
                  <Draggable key={job.id} draggableId={String(job.id)} index={index}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="bg-white rounded p-3 mb-2 shadow-sm"
                      >
                        <p className="font-medium text-sm">{job.workOrderNumber}</p>
                        <p className="text-xs text-gray-600">{job.customerName}</p>
                        <p className="text-xs text-gray-500">{job.scheduledTime}</p>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          {/* Technician Columns */}
          {technicians.map(tech => (
            <Droppable key={tech.id} droppableId={`tech-${tech.id}`}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="bg-blue-50 rounded-lg p-4"
                >
                  <h2 className="font-semibold mb-4">
                    {tech.name} ({tech.jobs.length})
                  </h2>
                  {tech.jobs.map((job, index) => (
                    <Draggable key={job.id} draggableId={String(job.id)} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className="bg-white rounded p-3 mb-2 shadow-sm"
                        >
                          <p className="font-medium text-sm">{job.workOrderNumber}</p>
                          <p className="text-xs text-gray-600">{job.customerName}</p>
                          <p className="text-xs text-gray-500">{job.scheduledTime}</p>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default DispatchBoard;

// ============================================================================
// MOBILE APP NOTES (React Native)
// ============================================================================

/*
For mobile app conversion, use React Native with the same API:

Key mobile features:
1. Offline mode with local SQLite database
2. GPS tracking for technician routing
3. Camera integration for before/after photos
4. Digital signature capture for invoices
5. Push notifications for job assignments
6. Mobile-optimized forms with barcode scanning for parts

Dependencies:
- react-native
- @react-navigation/native
- react-native-sqlite-storage (offline mode)
- react-native-maps (routing)
- react-native-camera (photos)
- react-native-signature-capture
- @react-native-firebase/messaging (push notifications)
*/
