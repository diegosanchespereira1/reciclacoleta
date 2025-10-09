import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { ReportData } from '../types';
import { ReportService } from '../services/reportService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface ChartsProps {
  data: ReportData;
  showCollectorDetails?: boolean;
  chartRefs?: React.RefObject<HTMLDivElement | null>[];
}

const Charts: React.FC<ChartsProps> = ({ data, showCollectorDetails = false, chartRefs = [] }) => {
  const colors = ReportService.getChartColors();

  // Gráfico de coleta por tipo de material (Barras)
  const materialTypeData = {
    labels: Object.keys(data.collectionsByType).map(type => 
      ReportService.getMaterialTypeLabel(type)
    ),
    datasets: [
      {
        label: 'Quantidade de Coletas',
        data: Object.values(data.collectionsByType),
        backgroundColor: colors.slice(0, Object.keys(data.collectionsByType).length),
        borderColor: colors.slice(0, Object.keys(data.collectionsByType).length),
        borderWidth: 1,
      },
    ],
  };

  // Gráfico de peso por tipo de material (Rosquinha)
  const weightByTypeData = {
    labels: Object.keys(data.weightByType).map(type => 
      ReportService.getMaterialTypeLabel(type)
    ),
    datasets: [
      {
        data: Object.values(data.weightByType),
        backgroundColor: colors.slice(0, Object.keys(data.weightByType).length),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  // Gráfico de status das coletas
  const statusData = {
    labels: Object.keys(data.collectionsByStatus).map(status => 
      ReportService.getStatusLabel(status)
    ),
    datasets: [
      {
        data: Object.values(data.collectionsByStatus),
        backgroundColor: colors.slice(0, Object.keys(data.collectionsByStatus).length),
        borderColor: '#ffffff',
        borderWidth: 2,
      },
    ],
  };

  // Gráfico de tendência diária
  const dailyTrendData = {
    labels: data.dailyCollections.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }),
    datasets: [
      {
        label: 'Coletas por Dia',
        data: data.dailyCollections.map(item => item.count),
        borderColor: colors[0],
        backgroundColor: colors[0] + '20',
        tension: 0.4,
      },
    ],
  };

  // Gráfico de peso diário
  const dailyWeightData = {
    labels: data.dailyCollections.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }),
    datasets: [
      {
        label: 'Peso por Dia (kg)',
        data: data.dailyCollections.map(item => item.weight),
        borderColor: colors[1],
        backgroundColor: colors[1] + '20',
        tension: 0.4,
      },
    ],
  };

  // Gráfico de coletores (se permitido)
  const collectorsData = showCollectorDetails ? {
    labels: Object.values(data.collectionsByCollector).map(collector => collector.name),
    datasets: [
      {
        label: 'Coletas por Coletor',
        data: Object.values(data.collectionsByCollector).map(collector => collector.count),
        backgroundColor: colors.slice(0, Object.keys(data.collectionsByCollector).length),
        borderColor: colors.slice(0, Object.keys(data.collectionsByCollector).length),
        borderWidth: 1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        font: {
          size: 14,
        },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        font: {
          size: 14,
        },
      },
    },
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
      {/* Gráfico de coletas por tipo */}
      <div 
        ref={chartRefs[0]}
        style={{ height: '300px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      >
        <Bar 
          data={materialTypeData} 
          options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              title: {
                ...chartOptions.plugins.title,
                text: 'Coletas por Tipo de Material',
              },
            },
          }}
        />
      </div>

      {/* Gráfico de peso por tipo */}
      <div 
        ref={chartRefs[1]}
        style={{ height: '300px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      >
        <Doughnut 
          data={weightByTypeData} 
          options={{
            ...doughnutOptions,
            plugins: {
              ...doughnutOptions.plugins,
              title: {
                ...doughnutOptions.plugins.title,
                text: 'Peso por Tipo de Material (kg)',
              },
            },
          }}
        />
      </div>

      {/* Gráfico de status */}
      <div 
        ref={chartRefs[2]}
        style={{ height: '300px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      >
        <Doughnut 
          data={statusData} 
          options={{
            ...doughnutOptions,
            plugins: {
              ...doughnutOptions.plugins,
              title: {
                ...doughnutOptions.plugins.title,
                text: 'Status das Coletas',
              },
            },
          }}
        />
      </div>

      {/* Gráfico de tendência diária */}
      <div 
        ref={chartRefs[3]}
        style={{ height: '300px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      >
        <Line 
          data={dailyTrendData} 
          options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              title: {
                ...chartOptions.plugins.title,
                text: 'Tendência de Coletas Diárias',
              },
            },
          }}
        />
      </div>

      {/* Gráfico de peso diário */}
      <div 
        ref={chartRefs[4]}
        style={{ height: '300px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
      >
        <Line 
          data={dailyWeightData} 
          options={{
            ...chartOptions,
            plugins: {
              ...chartOptions.plugins,
              title: {
                ...chartOptions.plugins.title,
                text: 'Tendência de Peso Diário (kg)',
              },
            },
          }}
        />
      </div>

      {/* Gráfico de coletores (apenas para admin) */}
      {showCollectorDetails && collectorsData && (
        <div 
          ref={chartRefs[5]}
          style={{ height: '300px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
        >
          <Bar 
            data={collectorsData} 
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: {
                  ...chartOptions.plugins.title,
                  text: 'Coletas por Coletor',
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
};

export default Charts;
