import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { ReportData, ReportFilters } from '../types';
import { ReportService } from './reportService';
import { format } from 'date-fns';

export class PDFService {
  static async generateReportPDF(
    reportData: ReportData,
    filters: ReportFilters,
    title: string,
    includeCharts: boolean = true,
    includeTables: boolean = true,
    includeCollectorDetails: boolean = false,
    chartRefs?: React.RefObject<HTMLDivElement | null>[]
  ): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Configurações do PDF
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(46, 125, 50); // Verde principal

    // Título do relatório
    pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Data de geração
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`Relatório gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Período do relatório
    if (filters.startDate || filters.endDate) {
      const startDate = filters.startDate ? format(filters.startDate, 'dd/MM/yyyy') : 'Início';
      const endDate = filters.endDate ? format(filters.endDate, 'dd/MM/yyyy') : 'Hoje';
      pdf.text(`Período: ${startDate} a ${endDate}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 15;
    }

    // Resumo executivo
    yPosition = this.addSummarySection(pdf, reportData, yPosition, pageWidth);

    // Filtros aplicados
    if (this.hasFilters(filters)) {
      yPosition = this.addFiltersSection(pdf, filters, yPosition, pageWidth);
    }

    // Verificar se precisa de nova página
    if (yPosition > pageHeight - 50) {
      pdf.addPage();
      yPosition = 20;
    }

    // Tabelas detalhadas
    if (includeTables) {
      yPosition = this.addTablesSection(pdf, reportData, yPosition, pageWidth, includeCollectorDetails);
    }

    // Se incluir gráficos, capturar e adicionar ao PDF
    if (includeCharts && chartRefs && chartRefs.length > 0) {
      await this.addChartsToPDF(pdf, chartRefs, includeCollectorDetails);
    } else if (includeCharts) {
      await this.addChartsPage(pdf, reportData, includeCollectorDetails);
    }

    // Salvar o PDF
    const fileName = `relatorio_coletas_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.pdf`;
    pdf.save(fileName);
  }

  private static addSummarySection(pdf: jsPDF, data: ReportData, yPosition: number, pageWidth: number): number {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(46, 125, 50);
    pdf.text('Resumo Executivo', 20, yPosition);
    yPosition += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);

    // Métricas principais
    const metrics = [
      { label: 'Total de Coletas:', value: data.totalCollections.toString() },
      { label: 'Peso Total:', value: `${data.totalWeight.toFixed(2)} kg` },
      { label: 'Tipos de Material:', value: Object.keys(data.collectionsByType).length.toString() },
      { label: 'Localizações:', value: Object.keys(data.collectionsByLocation).length.toString() }
    ];

    metrics.forEach((metric, index) => {
      const x = 20 + (index % 2) * (pageWidth / 2);
      const y = yPosition + Math.floor(index / 2) * 8;
      pdf.text(`${metric.label} ${metric.value}`, x, y);
    });

    yPosition += 20;
    return yPosition;
  }

  private static addFiltersSection(pdf: jsPDF, filters: ReportFilters, yPosition: number, pageWidth: number): number {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(46, 125, 50);
    pdf.text('Filtros Aplicados', 20, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);

    const appliedFilters: string[] = [];
    
    if (filters.startDate) {
      appliedFilters.push(`Data inicial: ${format(filters.startDate, 'dd/MM/yyyy')}`);
    }
    if (filters.endDate) {
      appliedFilters.push(`Data final: ${format(filters.endDate, 'dd/MM/yyyy')}`);
    }
    if (filters.materialType) {
      appliedFilters.push(`Material: ${ReportService.getMaterialTypeLabel(filters.materialType)}`);
    }
    if (filters.status) {
      appliedFilters.push(`Status: ${ReportService.getStatusLabel(filters.status)}`);
    }
    if (filters.location) {
      appliedFilters.push(`Localização: ${filters.location}`);
    }

    appliedFilters.forEach(filter => {
      pdf.text(`• ${filter}`, 25, yPosition);
      yPosition += 5;
    });

    yPosition += 10;
    return yPosition;
  }

  private static addTablesSection(
    pdf: jsPDF, 
    data: ReportData, 
    yPosition: number, 
    pageWidth: number,
    includeCollectorDetails: boolean
  ): number {
    // Tabela de coletas por tipo
    yPosition = this.addTable(
      pdf, 
      'Coletas por Tipo de Material', 
      ['Tipo', 'Quantidade', 'Peso (kg)'],
      Object.entries(data.collectionsByType).map(([type, count]) => [
        ReportService.getMaterialTypeLabel(type),
        count.toString(),
        data.weightByType[type]?.toFixed(2) || '0.00'
      ]),
      yPosition,
      pageWidth
    );

    // Tabela de status
    yPosition = this.addTable(
      pdf,
      'Coletas por Status',
      ['Status', 'Quantidade'],
      Object.entries(data.collectionsByStatus).map(([status, count]) => [
        ReportService.getStatusLabel(status),
        count.toString()
      ]),
      yPosition,
      pageWidth
    );

    // Tabela de coletores (apenas para admin)
    if (includeCollectorDetails) {
      yPosition = this.addTable(
        pdf,
        'Coletas por Coletor',
        ['Coletor', 'Quantidade', 'Peso (kg)'],
        Object.values(data.collectionsByCollector).map(collector => [
          collector.name,
          collector.count.toString(),
          collector.weight.toFixed(2)
        ]),
        yPosition,
        pageWidth
      );
    }

    return yPosition;
  }

  private static addTable(
    pdf: jsPDF,
    title: string,
    headers: string[],
    rows: string[][],
    yPosition: number,
    pageWidth: number
  ): number {
    // Verificar se precisa de nova página
    if (yPosition > pdf.internal.pageSize.getHeight() - 40) {
      pdf.addPage();
      yPosition = 20;
    }

    // Título da tabela
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(46, 125, 50);
    pdf.text(title, 20, yPosition);
    yPosition += 8;

    // Cabeçalho da tabela
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.setTextColor(0, 0, 0);

    const colWidths = [60, 30, 30];
    const startX = 20;

    // Desenhar cabeçalho
    headers.forEach((header, index) => {
      const x = startX + colWidths.slice(0, index).reduce((sum, width) => sum + width, 0);
      pdf.text(header, x, yPosition);
    });
    yPosition += 5;

    // Linha do cabeçalho
    pdf.setDrawColor(46, 125, 50);
    pdf.setLineWidth(0.5);
    pdf.line(startX, yPosition, startX + colWidths.reduce((sum, width) => sum + width, 0), yPosition);
    yPosition += 3;

    // Linhas da tabela
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    
    rows.forEach((row, rowIndex) => {
      // Verificar se precisa de nova página
      if (yPosition > pdf.internal.pageSize.getHeight() - 20) {
        pdf.addPage();
        yPosition = 20;
      }

      row.forEach((cell, colIndex) => {
        const x = startX + colWidths.slice(0, colIndex).reduce((sum, width) => sum + width, 0);
        pdf.text(cell, x, yPosition);
      });
      yPosition += 4;
    });

    yPosition += 10;
    return yPosition;
  }

  private static async addChartsToPDF(
    pdf: jsPDF, 
    chartRefs: React.RefObject<HTMLDivElement | null>[], 
    includeCollectorDetails: boolean
  ): Promise<void> {
    const chartTitles = [
      'Coletas por Tipo de Material',
      'Peso por Tipo de Material (kg)',
      'Status das Coletas',
      'Tendência de Coletas Diárias',
      'Tendência de Peso Diário (kg)'
    ];

    if (includeCollectorDetails) {
      chartTitles.push('Coletas por Coletor');
    }

    // Adicionar página para gráficos
    pdf.addPage();
    
    let yPosition = 20;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const chartWidth = 160; // Largura da imagem do gráfico
    const chartHeight = 120; // Altura da imagem do gráfico

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(46, 125, 50);
    pdf.text('Gráficos e Visualizações', 20, yPosition);
    yPosition += 15;

    // Capturar cada gráfico
    for (let i = 0; i < chartRefs.length && i < chartTitles.length; i++) {
      const chartRef = chartRefs[i];
      const title = chartTitles[i];

      if (chartRef.current) {
        try {
          // Capturar o gráfico como canvas
          const canvas = await html2canvas(chartRef.current, {
            backgroundColor: '#ffffff',
            scale: 2, // Maior resolução
            useCORS: true,
            allowTaint: true
          });

          // Verificar se precisa de nova página
          if (yPosition + chartHeight + 30 > pageHeight) {
            pdf.addPage();
            yPosition = 20;
          }

          // Adicionar título do gráfico
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(12);
          pdf.setTextColor(46, 125, 50);
          pdf.text(title, 20, yPosition);
          yPosition += 10;

          // Adicionar a imagem do gráfico
          const imgData = canvas.toDataURL('image/png');
          const xPosition = (pageWidth - chartWidth) / 2; // Centralizar
          
          pdf.addImage(imgData, 'PNG', xPosition, yPosition, chartWidth, chartHeight);
          yPosition += chartHeight + 20;

        } catch (error) {
          console.error(`Erro ao capturar gráfico ${i + 1}:`, error);
          
          // Se falhar, adicionar texto explicativo
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          pdf.text(`${title} - Erro ao gerar imagem`, 20, yPosition);
          yPosition += 15;
        }
      }
    }

    // Adicionar nota explicativa
    yPosition += 10;
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text('* Os gráficos foram capturados em alta resolução para melhor visualização.', 20, yPosition);
  }

  private static async addChartsPage(pdf: jsPDF, data: ReportData, includeCollectorDetails: boolean): Promise<void> {
    // Fallback quando não há refs dos gráficos
    pdf.addPage();
    
    let yPosition = 20;
    
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(46, 125, 50);
    pdf.text('Gráficos e Visualizações', 20, yPosition);
    yPosition += 15;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);

    const chartDescriptions = [
      '• Gráfico de Barras: Coletas por Tipo de Material',
      '• Gráfico de Rosquinha: Distribuição de Peso por Material',
      '• Gráfico de Rosquinha: Status das Coletas',
      '• Gráfico de Linha: Tendência de Coletas Diárias',
      '• Gráfico de Linha: Tendência de Peso Diário'
    ];

    if (includeCollectorDetails) {
      chartDescriptions.push('• Gráfico de Barras: Coletas por Coletor');
    }

    chartDescriptions.forEach(description => {
      pdf.text(description, 25, yPosition);
      yPosition += 8;
    });

    yPosition += 10;
    pdf.text('Nota: Para visualizar os gráficos completos, acesse a versão web do relatório.', 20, yPosition);
  }

  private static hasFilters(filters: ReportFilters): boolean {
    return !!(
      filters.startDate ||
      filters.endDate ||
      filters.collectorId ||
      filters.materialType ||
      filters.status ||
      filters.location
    );
  }
}
