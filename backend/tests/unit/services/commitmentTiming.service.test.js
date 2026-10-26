import {it,expect} from 'vitest';
const {timing,workTiming,timingMissing,timingFields}=require('../../../src/services/commitmentTiming.service');
const commute={preparationMinutes:60,outboundMinutes:15,returnMinutes:15};
it('conta uma hora de preparo e um trajeto em cada direção',()=>{expect(timing(commute)).toEqual({beforeMinutes:75,afterMinutes:15})});
it('ignora deslocamentos antigos para rotinas remotas, mantendo o preparo opcional',()=>{
 expect(timing({...commute,locationMode:'REMOTE'})).toEqual({beforeMinutes:60,afterMinutes:0});
 expect(timingMissing({name:'Culto online',locationMode:'REMOTE'},'rotinas')).toEqual([]);
 expect(workTiming({...commute,locationMode:'REMOTE',travelDuringBreak:true},1,2)).toEqual({beforeMinutes:0,afterMinutes:0});
});
it('não inventa retorno para casa no almoço nem repete o preparo entre blocos',()=>{
 expect(workTiming(commute,0,2)).toEqual({beforeMinutes:75,afterMinutes:0});
 expect(workTiming(commute,1,2)).toEqual({beforeMinutes:0,afterMinutes:15});
 expect(workTiming({...commute,travelDuringBreak:true},0,2)).toEqual({beforeMinutes:75,afterMinutes:15});
 expect(workTiming({...commute,travelDuringBreak:true},1,2)).toEqual({beforeMinutes:75,afterMinutes:15});
});
it('distingue tempo não informado de zero confirmado e rejeita durações inválidas',()=>{
 expect(timingMissing({name:'Culto'},'rotinas')).toHaveLength(3);
 expect(timingMissing({name:'Culto',preparationMinutes:0,outboundMinutes:0,returnMinutes:0},'rotinas')).toEqual([]);
 expect(timingMissing({workType:'REMOTE'},'trabalho')).toEqual([]);
 expect(()=>timingFields.outboundMinutes.parse(-1)).toThrow();
});
