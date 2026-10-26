const labels={preparationMinutes:'preparo',outboundMinutes:'ida',returnMinutes:'volta'};
export default function CommitmentTiming({items=[]}){
 if(!items.length)return null;
 const pending=items.filter(item=>item.missing?.length);
 return <section className="assistant-context-summary"><h3>Preparo e deslocamento</h3>{pending.length>0&&<p role="status" className="ai-unresolved">Análise parcial: confirme os tempos abaixo em Planejamento → editar rotina ou trabalho. Informe 0 quando não houver deslocamento. A IA não presume distâncias ou tempo de viagem.</p>}<ul>{items.map((item,index)=><li key={`${item.kind}:${item.title}:${index}`}><strong>{item.title}</strong>: {item.missing?.length?`falta informar ${item.missing.map(key=>labels[key]).join(', ')}.`:`${item.beforeMinutes} min antes e ${item.afterMinutes} min depois reservados.`}{item.travelDuringBreak?' Inclui ida e volta no intervalo.':''}</li>)}</ul></section>;
}
