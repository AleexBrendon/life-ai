import {describe,it,expect} from 'vitest';
const {buildInsights}=require('../../../src/services/dashboardInsights.service');
const date='2026-10-17T00:00:00Z';
describe('Gráficos do dashboard',()=>{
 it('mantém dias sem registros como lacunas e não fabrica dados',()=>{
  const result=buildInsights({endDate:'2026-10-17',days:7});expect(result.daily).toHaveLength(7);expect(result.daily.every(d=>d.rate===null)).toBe(true);expect(result.summary.completed).toBe(0);expect(result.categories).toEqual([]);
 });
 it('calcula conclusão, categorias e minutos distribuídos por hora',()=>{
  const result=buildInsights({endDate:'2026-10-17',days:7,routines:[{date,status:'COMPLETED',startTime:'08:30',endTime:'09:15',routineItem:{type:'Saúde'}},{date,status:'PENDING',startTime:'10:00',endTime:'11:00'}],reminders:[{date,status:'COMPLETED'}],sessions:[{date,status:'COMPLETED',startTime:'18:00',endTime:'18:30'}]});
  expect(result.summary).toEqual({completed:3,total:4,rate:75,minutes:75,activeDays:1});expect(result.heatmap[5].hours[8]).toBe(30);expect(result.heatmap[5].hours[9]).toBe(15);expect(result.heatmap[5].hours[18]).toBe(30);expect(result.categories.reduce((n,c)=>n+c.value,0)).toBe(3);
 });
 it('exclui dados fora do período e não conta duração inválida',()=>{
  const result=buildInsights({endDate:'2026-10-17',days:7,routines:[{date:'2026-10-01',status:'COMPLETED',startTime:'08:00',endTime:'09:00'},{date,status:'COMPLETED',startTime:'18:00',endTime:'17:00'}]});expect(result.summary.completed).toBe(1);expect(result.summary.minutes).toBe(0);expect(result.startDate).toBe('2026-10-11');
 });
});
