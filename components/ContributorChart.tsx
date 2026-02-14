'use client';

import React, { useRef, useEffect, useCallback } from 'react';
import * as d3Scale from 'd3-scale';
import * as d3Shape from 'd3-shape';
import * as d3Selection from 'd3-selection';
import 'd3-transition';
import * as d3Axis from 'd3-axis';
import * as d3Array from 'd3-array';
import * as d3TimeFormat from 'd3-time-format';
import { RepoContributorSeries, ChartSettings } from '@/lib/types';
import { normalizeToDay0, formatDayOffset } from '@/lib/transform';
import { CHART_MARGIN, CHART_HEIGHT } from '@/lib/colors';

interface Props {
  series: RepoContributorSeries[];
  settings: ChartSettings;
  width?: number;
}

function wobblePath(pathD: string, magnitude: number = 2): string {
  return pathD.replace(/(\d+\.?\d*)/g, (match) => {
    const num = parseFloat(match);
    const wobble = (Math.random() - 0.5) * magnitude;
    return (num + wobble).toFixed(2);
  });
}

export default function ContributorChart({ series, settings, width: propWidth }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const drawChart = useCallback(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container) return;

    const width = propWidth ?? container.clientWidth;
    const margin = { ...CHART_MARGIN, bottom: 55, left: 65, right: 90 };
    const innerW = width - margin.left - margin.right;
    const innerH = CHART_HEIGHT - margin.top - margin.bottom;

    d3Selection.select(svg).selectAll('*').remove();

    const visibleSeries = series.filter((s) => s.visible);
    if (!visibleSeries.length) return;

    const plotData = visibleSeries.map((s) => ({
      ...s,
      data: settings.timelineMode ? normalizeToDay0(s.data) : s.data,
    }));

    const allDates = plotData.flatMap((s) => s.data.map((d) => d.date));
    const allValues = plotData.flatMap((s) => s.data.map((d) => d.cumulativeContributors));

    const xExtent = d3Array.extent(allDates) as [Date, Date];
    const yMax = d3Array.max(allValues) ?? 0;

    const x = d3Scale.scaleTime().domain(xExtent).range([0, innerW]);
    const y = d3Scale.scaleLinear().domain([0, yMax * 1.15]).nice().range([innerH, 0]);

    const root = d3Selection
      .select(svg)
      .attr('width', width)
      .attr('height', CHART_HEIGHT)
      .attr('viewBox', `0 0 ${width} ${CHART_HEIGHT}`)
      .classed('sketch-mode', settings.xkcdStyle);

    const defs = root.append('defs');

    // Candy gradient fills — thick, opaque, bubbly
    plotData.forEach((s, i) => {
      const grad = defs.append('linearGradient')
        .attr('id', `area-grad-${i}`)
        .attr('x1', '0').attr('y1', '0')
        .attr('x2', '0').attr('y2', '1');
      grad.append('stop').attr('offset', '0%').attr('stop-color', s.color).attr('stop-opacity', 0.35);
      grad.append('stop').attr('offset', '100%').attr('stop-color', s.color).attr('stop-opacity', 0.05);

      // Glow filter
      const filter = defs.append('filter').attr('id', `glow-${i}`);
      filter.append('feGaussianBlur').attr('stdDeviation', '4').attr('result', 'blur');
      filter.append('feMerge').selectAll('feMergeNode')
        .data(['blur', 'SourceGraphic']).enter()
        .append('feMergeNode').attr('in', (d: string) => d);
    });

    // Drop shadow for labels
    const shadow = defs.append('filter').attr('id', 'label-shadow').attr('x', '-20%').attr('y', '-20%').attr('width', '140%').attr('height', '140%');
    shadow.append('feDropShadow').attr('dx', '0').attr('dy', '2').attr('stdDeviation', '3').attr('flood-opacity', '0.12');

    const g = root.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Bubbly dotted gridlines
    const yTicks = y.ticks(5);
    g.append('g')
      .selectAll('line')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('x1', 0)
      .attr('x2', innerW)
      .attr('y1', (d) => y(d))
      .attr('y2', (d) => y(d))
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-dasharray', '3,8')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-linecap', 'round')
      .attr('stroke-width', 1.5);

    // X Axis — chunky rounded
    const xAxis = settings.timelineMode
      ? d3Axis.axisBottom(x).ticks(6).tickFormat((d) => formatDayOffset(d as Date))
      : d3Axis.axisBottom(x).ticks(6).tickFormat(d3TimeFormat.timeFormat('%b \'%y') as any);

    const xAxisG = g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(xAxis);
    xAxisG.select('.domain').attr('stroke', 'var(--color-border)').attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
    xAxisG.selectAll('.tick line').attr('stroke', 'var(--color-border)').attr('stroke-linecap', 'round').attr('stroke-width', 2);
    xAxisG.selectAll('.tick text')
      .attr('fill', 'var(--color-muted)')
      .style('font-size', '11px')
      .style('font-weight', '600');

    // Y Axis — chunky rounded
    const yAxisG = g.append('g')
      .call(d3Axis.axisLeft(y).ticks(5).tickFormat((d) => {
        const n = d as number;
        return n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`;
      }));
    yAxisG.select('.domain').attr('stroke', 'var(--color-border)').attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
    yAxisG.selectAll('.tick line').attr('stroke', 'var(--color-border)').attr('stroke-linecap', 'round').attr('stroke-width', 2);
    yAxisG.selectAll('.tick text')
      .attr('fill', 'var(--color-muted)')
      .style('font-size', '11px')
      .style('font-weight', '600');

    // Y label
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 16)
      .attr('x', -innerH / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-muted)')
      .style('font-size', '12px')
      .style('font-weight', '700')
      .text('💖 Contributors');

    // X label (timeline mode only)
    if (settings.timelineMode) {
      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', innerH + margin.bottom - 10)
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--color-muted)')
        .style('font-size', '12px')
        .style('font-weight', '700')
        .text('⏱ Time since first contribution');
    }

    // Smooth curves
    const lineGen = d3Shape
      .line<{ date: Date; cumulativeContributors: number }>()
      .x((d) => x(d.date))
      .y((d) => y(d.cumulativeContributors))
      .curve(settings.xkcdStyle ? d3Shape.curveBasis : d3Shape.curveMonotoneX);

    const areaGen = d3Shape
      .area<{ date: Date; cumulativeContributors: number }>()
      .x((d) => x(d.date))
      .y0(innerH)
      .y1((d) => y(d.cumulativeContributors))
      .curve(settings.xkcdStyle ? d3Shape.curveBasis : d3Shape.curveMonotoneX);

    // Draw each series
    plotData.forEach((s, i) => {
      // Candy gradient fill
      const areaPath = areaGen(s.data) ?? '';
      g.append('path')
        .attr('d', settings.xkcdStyle ? wobblePath(areaPath, 1.5) : areaPath)
        .attr('fill', `url(#area-grad-${i})`)
        .style('opacity', 0)
        .transition()
        .duration(800)
        .delay(i * 150)
        .style('opacity', 1);

      const linePath = lineGen(s.data) ?? '';
      const finalPath = settings.xkcdStyle ? wobblePath(linePath, 2) : linePath;

      // Thick white outline — chunky sticker effect
      g.append('path')
        .attr('d', finalPath)
        .attr('fill', 'none')
        .attr('stroke', 'var(--color-surface)')
        .attr('stroke-width', 9)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .style('opacity', 0)
        .transition()
        .duration(200)
        .delay(i * 150)
        .style('opacity', 0.9);

      // Main candy line — extra thick and smooth
      const line = g.append('path')
        .attr('d', finalPath)
        .attr('fill', 'none')
        .attr('stroke', s.color)
        .attr('stroke-width', 5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round');

      // Animate line drawing
      const lineNode = line.node();
      if (lineNode) {
        const length = lineNode.getTotalLength();
        line
          .attr('stroke-dasharray', length)
          .attr('stroke-dashoffset', length)
          .transition()
          .duration(1400)
          .delay(i * 150)
          .ease((t: number) => t * (2 - t))
          .attr('stroke-dashoffset', 0);
      }

      // End dot — chunky candy dot with glow ring
      const last = s.data[s.data.length - 1];
      if (last) {
        // Big soft glow
        g.append('circle')
          .attr('cx', x(last.date))
          .attr('cy', y(last.cumulativeContributors))
          .attr('r', 0)
          .attr('fill', s.color)
          .attr('fill-opacity', 0.2)
          .style('filter', `url(#glow-${i})`)
          .transition()
          .duration(800)
          .delay(1400 + i * 150)
          .attr('r', 18);

        // White ring
        g.append('circle')
          .attr('cx', x(last.date))
          .attr('cy', y(last.cumulativeContributors))
          .attr('r', 0)
          .attr('fill', 'var(--color-surface)')
          .attr('stroke', s.color)
          .attr('stroke-width', 3.5)
          .transition()
          .duration(400)
          .delay(1400 + i * 150)
          .attr('r', 9);

        // Inner dot
        g.append('circle')
          .attr('cx', x(last.date))
          .attr('cy', y(last.cumulativeContributors))
          .attr('r', 0)
          .attr('fill', s.color)
          .transition()
          .duration(300)
          .delay(1500 + i * 150)
          .attr('r', 5);

        // Bubbly end label — pill shape
        const labelText = last.cumulativeContributors.toLocaleString();
        const repoName = s.repo.split('/')[1] || s.repo;
        const labelX = x(last.date) + 18;
        const labelY = y(last.cumulativeContributors);
        const pillW = Math.max(labelText.length * 9 + 16, repoName.length * 7 + 16);

        const labelG = g.append('g')
          .style('opacity', 0);

        // Pill background
        labelG.append('rect')
          .attr('x', labelX - 6)
          .attr('y', labelY - 15)
          .attr('width', pillW)
          .attr('height', 34)
          .attr('rx', 12)
          .attr('ry', 12)
          .attr('fill', 'var(--color-surface)')
          .attr('stroke', s.color)
          .attr('stroke-width', 2)
          .style('filter', 'url(#label-shadow)');

        // Count number
        labelG.append('text')
          .attr('x', labelX + 2)
          .attr('y', labelY + 4)
          .attr('fill', s.color)
          .style('font-size', '15px')
          .style('font-weight', '800')
          .text(labelText);

        // Repo name
        labelG.append('text')
          .attr('x', labelX + 2)
          .attr('y', labelY + 16)
          .attr('fill', 'var(--color-muted)')
          .style('font-size', '9px')
          .style('font-weight', '600')
          .text(repoName);

        labelG.transition()
          .duration(500)
          .delay(1600 + i * 150)
          .style('opacity', 1);
      }
    });

    // Crosshair + tooltip
    const bisect = d3Array.bisector<{ date: Date }, Date>((d) => d.date).left;

    const crosshairG = g.append('g').style('display', 'none');
    crosshairG.append('line')
      .attr('class', 'crosshair-x')
      .attr('y1', 0)
      .attr('y2', innerH)
      .attr('stroke', 'var(--color-muted)')
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', '4,6')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-linecap', 'round');

    // Chunky hover dots
    const hoverDots = plotData.map((s) =>
      crosshairG.append('circle')
        .attr('r', 8)
        .attr('fill', s.color)
        .attr('stroke', 'var(--color-surface)')
        .attr('stroke-width', 3.5)
    );

    const overlay = g.append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('fill', 'none')
      .attr('pointer-events', 'all')
      .style('cursor', 'crosshair');

    const tooltipEl = tooltipRef.current;

    overlay
      .on('mousemove', function (event: MouseEvent) {
        if (!tooltipEl) return;
        const [mx] = d3Selection.pointer(event, this);
        const date = x.invert(mx);

        crosshairG.style('display', null);
        crosshairG.select('.crosshair-x')
          .attr('x1', mx)
          .attr('x2', mx);

        const lines: string[] = [];
        plotData.forEach((s, i) => {
          const idx = Math.min(bisect(s.data, date), s.data.length - 1);
          const d = s.data[idx];
          if (d) {
            hoverDots[i]
              .attr('cx', x(d.date))
              .attr('cy', y(d.cumulativeContributors));

            const repoName = s.repo.split('/')[1] || s.repo;
            lines.push(
              `<div style="display:flex;align-items:center;gap:8px;padding:3px 0"><span style="width:12px;height:12px;border-radius:50%;background:${s.color};display:inline-block;flex-shrink:0;box-shadow:0 0 8px ${s.color}50;border:2px solid white"></span><span style="font-weight:700">${repoName}</span><span style="margin-left:auto;font-weight:800;color:${s.color};font-size:15px">${d.cumulativeContributors.toLocaleString()}</span></div>`,
            );
          }
        });

        const headerDate = (() => {
          const d = plotData[0]?.data[Math.min(bisect(plotData[0].data, date), plotData[0].data.length - 1)];
          if (!d) return '';
          return settings.timelineMode
            ? formatDayOffset(d.date)
            : d.date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        })();

        tooltipEl.innerHTML = `<div style="font-size:10px;color:var(--color-muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;font-weight:700">${headerDate}</div>${lines.join('')}`;
        tooltipEl.style.display = 'block';

        const containerRect = container.getBoundingClientRect();
        const tooltipW = tooltipEl.offsetWidth;
        let left = event.clientX - containerRect.left + 20;
        if (left + tooltipW > containerRect.width - 10) left = left - tooltipW - 40;
        tooltipEl.style.left = `${Math.max(0, left)}px`;
        tooltipEl.style.top = `${event.clientY - containerRect.top - 20}px`;
      })
      .on('mouseleave', () => {
        crosshairG.style('display', 'none');
        if (tooltipEl) tooltipEl.style.display = 'none';
      });
  }, [series, settings, propWidth]);

  useEffect(() => {
    drawChart();
    const handleResize = () => drawChart();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawChart]);

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-3xl border-2 border-[var(--color-border)] bg-[var(--color-surface)] p-6 animate-fade-up"
      style={{ boxShadow: 'var(--shadow-lg), 0 0 0 1px var(--color-border)' }}
      id="chart-container"
    >
      <svg ref={svgRef} className="w-full" />
      <div ref={tooltipRef} className="chart-tooltip" style={{ display: 'none' }} />
    </div>
  );
}
