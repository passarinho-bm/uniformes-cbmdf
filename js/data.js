/* Catálogos extraídos do Regulamento de Uniformes do CBMDF 2026 (Anexo).
   As referências de página (p.) apontam para o PDF "Anexo_Uniforme_CBMDF.pdf". */
window.CBMDF = (function () {
  // Estrelas: CG = composta ouro, CP = composta prata, SP = simples prata (p.141, quadro de insígnias)
  const postos = [
    { id: 'cel', nome: 'Coronel', abrev: 'CEL BM', grupo: 'of', cat: 'Oficial superior', stars: ['CG', 'CG', 'CG'] },
    { id: 'tc', nome: 'Tenente-Coronel', abrev: 'TC BM', grupo: 'of', cat: 'Oficial superior', stars: ['CP', 'CG', 'CG'] },
    { id: 'maj', nome: 'Major', abrev: 'MAJ BM', grupo: 'of', cat: 'Oficial superior', stars: ['CP', 'CP', 'CG'] },
    { id: 'cap', nome: 'Capitão', abrev: 'CAP BM', grupo: 'of', cat: 'Oficial intermediário', stars: ['SP', 'SP', 'SP'] },
    { id: 'ten1', nome: '1º Tenente', abrev: '1º TEN BM', grupo: 'of', cat: 'Oficial subalterno', stars: ['SP', 'SP'] },
    { id: 'ten2', nome: '2º Tenente', abrev: '2º TEN BM', grupo: 'of', cat: 'Oficial subalterno', stars: ['SP'] },
    { id: 'asp', nome: 'Aspirante-a-Oficial', abrev: 'ASP OF BM', grupo: 'esp', cat: 'Praça especial', stars: ['AS'] },
    { id: 'cad2', nome: 'Cadete do 2º Ano', abrev: 'CAD/2 BM', grupo: 'esp', cat: 'Praça especial', cadete: 2 },
    { id: 'cad1', nome: 'Cadete do 1º Ano', abrev: 'CAD/1 BM', grupo: 'esp', cat: 'Praça especial', cadete: 1 },
    { id: 'st', nome: 'Subtenente', abrev: 'ST BM', grupo: 'st', cat: 'Subtenente' },
    // divisas: p = preta, c = cinza clara (separadora). 1º Sgt: 2 + cinza + 3; 2º Sgt: 1 + cinza + 3 (p.142)
    { id: 'sgt1', nome: '1º Sargento', abrev: '1º SGT BM', grupo: 'praca', cat: 'Sargento', divisas: 'ppcppp' },
    { id: 'sgt2', nome: '2º Sargento', abrev: '2º SGT BM', grupo: 'praca', cat: 'Sargento', divisas: 'pcppp' },
    { id: 'sgt3', nome: '3º Sargento', abrev: '3º SGT BM', grupo: 'praca', cat: 'Sargento', divisas: 'ppp' },
    { id: 'cb', nome: 'Cabo', abrev: 'CB BM', grupo: 'praca', cat: 'Cabo', divisas: 'pp' },
    { id: 'sd', nome: 'Soldado', abrev: 'SD BM', grupo: 'praca', cat: 'Soldado', divisas: 'p' },
    { id: 'sd2', nome: 'Soldado de 2ª Classe (aluno do CFP)', abrev: 'SD/2 BM', grupo: 'praca', cat: 'Soldado', divisas: '' },
  ];

  // Quadros de oficiais e Qualificações de praças (p.150). sprite = arma dourada (p.151-152)
  const quadrosOficiais = [
    { id: 'combatente', nome: 'Oficial Combatente (QOBM/Comb.)', sprite: 'combatente' },
    { id: 'complementar', nome: 'Oficial Complementar', sprite: 'complementar' },
    { id: 'medico', nome: 'Oficial de Saúde — Médico', sprite: 'medico' },
    { id: 'dentista', nome: 'Oficial de Saúde — Cirurgião-Dentista', sprite: 'dentista' },
    { id: 'capelao-catolico', nome: 'Oficial Capelão Católico', sprite: 'capelao-catolico' },
    { id: 'capelao-evangelico', nome: 'Oficial Capelão Evangélico', sprite: 'capelao-evangelico' },
    { id: 'intendente', nome: 'Oficial de Administração — Intendente', sprite: 'intendente' },
    { id: 'condutor', nome: 'Oficial de Administração — Condutor e Operador de Viaturas', sprite: 'condutor' },
    { id: 'manutencao', nome: 'Oficial Especialista — Manutenção', sprite: 'manutencao' },
    { id: 'musico', nome: 'Oficial Especialista — Músico', sprite: 'musico' },
  ];
  const qualificacoesPracas = [
    { id: 'qbmg1', nome: 'QBMG 1 — Operacional', sprite: 'combatente' },
    { id: 'qbmg2', nome: 'QBMG 2 — Condutor e Operador de Viaturas', sprite: 'condutor' },
    { id: 'qbmg3', nome: 'QBMG 3 — Manutenção', sprite: 'manutencao' },
    { id: 'qbmg4', nome: 'QBMG 4 — Músico', sprite: 'musico' },
  ];

  // Cursos de especialização com inscrição de manicaca (p.162). sprite = brevê real do regulamento (p.161)
  const cursosEsp = [
    { id: 'cesalt', sigla: 'CESALT', nome: 'Especialização em Salvamento em Altura', insc: 'ALTURA', func: false, sprite: 'cesalt' },
    { id: 'cepi', sigla: 'CEPI', nome: 'Especialização em Prevenção de Incêndio', insc: 'FISCALIZADOR', func: true, sprite: 'cepi' },
    { id: 'cpcif', sigla: 'CPCIF', nome: 'Prevenção e Combate a Incêndio Florestal', insc: 'FLORESTAL', func: false, sprite: 'cpcif' },
    { id: 'csa', sigla: 'CSA', nome: 'Salvamento Aquático', insc: 'GUARDA-VIDAS', func: true, sprite: 'csa' },
    { id: 'coi', sigla: 'COI', nome: 'Operações em Incêndio', insc: 'INCÊNDIO', func: false, sprite: 'coi' },
    { id: 'cmte', sigla: 'CMTE', nome: 'Métodos e Técnicas de Ensino BM', insc: 'INSTRUTOR', func: true, sprite: 'cmte' },
    { id: 'cats', sigla: 'CATS', nome: 'Atendimento a Tentativas de Suicídio', insc: 'INTERVENTOR', func: false, sprite: 'cats' },
    { id: 'cmaut', sigla: 'CMAUT', nome: 'Mergulho Autônomo', insc: 'MERGULHADOR', func: true, sprite: 'cmaut' },
    { id: 'cmope', sigla: 'CMOPE', nome: 'Motociclista Operacional', insc: 'MOTORRESGATE', func: false, sprite: 'cmope' },
    { id: 'cbresc', sigla: 'CBRESC', nome: 'Busca, Resgate e Salvamento com Cães', insc: 'OPERAÇÕES COM CÃES', func: false, sprite: 'cbresc' },
    { id: 'cpi', sigla: 'CPI', nome: 'Perícia de Incêndio', insc: 'PERITO', func: true, sprite: 'cpi' },
    { id: 'cavop', sigla: 'CAVOP', nome: 'Adaptação ao Voo Operacional', insc: 'PILOTO', func: true, sprite: 'cavop' },
    { id: 'corpas', sigla: 'CORPAS', nome: 'Operações com Aeronaves Remotamente Pilotadas', insc: 'PILOTO RPA', func: true, sprite: null },
    { id: 'csu-aph', sigla: 'CSU-APH', nome: 'Socorros de Urgência em Atend. Pré-Hospitalar', insc: 'SOCORRISTA', func: true, sprite: 'csu-aph' },
    { id: 'cobs', sigla: 'COBS', nome: 'Operações de Busca e Salvamento', insc: 'TERRESTRE', func: false, sprite: 'cobs' },
    { id: 'ctop', sigla: 'CTOP', nome: 'Tripulante Operacional', insc: 'TRIPULANTE OPERACIONAL', func: true, sprite: 'ctop' },
    { id: 'creve', sigla: 'CREVE', nome: 'Resgate Veicular', insc: 'VEICULAR', func: false, sprite: 'creve' },
  ];

  // Cursos de carreira (distintivo circular no bolso direito — p.157). O regulamento não lista siglas; estas são as citadas.
  const cursosCarreira = [
    { id: 'cfo', sigla: 'CFO', nome: 'Curso de Formação de Oficiais', sprite: 'curso-cfo' },
    { id: 'cho', sigla: 'CHO', nome: 'Curso de Habilitação de Oficiais (Quadro Complementar)', sprite: 'curso-cho' },
    { id: 'cho2', sigla: 'CHO', nome: 'Curso de Habilitação de Oficiais (Quadro de Saúde)', sprite: 'curso-cho2' },
    { id: 'cfp', sigla: 'CFP', nome: 'Curso de Formação de Praças', sprite: 'curso-cfp' },
    { id: 'cao', sigla: 'CAO', nome: 'Curso de Aperfeiçoamento de Oficiais', sprite: 'curso-cao' },
    { id: 'cao-adm', sigla: 'CAO', nome: 'Curso de Aperfeiçoamento de Oficiais Adm./Esp.', sprite: 'curso-cao-adm' },
    { id: 'cap', sigla: 'CAP', nome: 'Curso de Aperfeiçoamento de Praças', sprite: 'curso-cap' },
    { id: 'caeo', sigla: 'CAEO', nome: 'Curso de Altos Estudos para Oficiais', sprite: 'curso-caeo', caeo: true },
    { id: 'caep', sigla: 'CAEP', nome: 'Curso de Altos Estudos para Praças', sprite: 'curso-caep' },
    { id: 'cpo', sigla: 'CPO', nome: 'Curso Preparatório de Oficiais', sprite: 'curso-cpo' },
    { id: 'outro', sigla: '', nome: 'Outro curso de carreira (informar sigla)' },
  ];

  // Tabela de siglas do cadarço de lotação / distintivo de OBM (p.106-108)
  const obms = ['ABM', 'AJGER', 'AUDIT', 'CEABM', 'CECAF', 'CECOM', 'CEFAP', 'CEINT', 'CEMEV', 'CEPED', 'CEPOP', 'CESMA',
    'CMDP II', 'COCB', 'COESP', 'COGED', 'COMAP', 'COMAV', 'COMOP', 'COPAC', 'CTO', 'CTROL', 'DEALF', 'DEPCT', 'DERHU', 'DESEG',
    'DICOA', 'DIEAP', 'DIGEP', 'DIMAT', 'DINAP', 'DINVI', 'DIOFI', 'DIREN', 'DIREP', 'DISAU', 'DITIC', 'DIVIS', 'EMG', 'GABCG',
    'GACOP', 'GAEPH', 'GBMOT', 'GBS', 'GPCIU', 'GPCIV', 'GPRAM', 'NCUST', 'OUVID', 'PODON', 'POMED', 'SUBCG', 'SUCOP'];
  for (let i = 1; i <= 30; i++) obms.push(i + 'º GBM');
  for (let i = 1; i <= 3; i++) obms.push(i + 'º ESAV');
  ['COMAR I', 'COMAR II', 'COMAR III', 'COMAR IV'].forEach((s) => obms.push(s));

  // Aplique de comando e chefia (p.166-167) — só oficiais, só túnica e camisa bege
  const funcoes = [
    { id: '', nome: 'Nenhuma' },
    { id: 'cmtgeral', nome: 'Comandante-Geral', cadarco: 'CMT-GERAL', cor: '#c8141e', forma: 'coroa-espada' },
    { id: 'subcmt', nome: 'Subcomandante-Geral', cadarco: 'SUBCMT-GERAL', cor: '#2f7d3a', forma: 'coroa' },
    { id: 'cmtop', nome: 'Comandante Operacional', cadarco: 'CMT OPERACIONAL', cor: '#c8141e', forma: 'capacete' },
    { id: 'cmtesp', nome: 'Comandante de unidade especializada ou multiemprego', cor: '#2f7d3a', forma: 'capacete' },
    { id: 'excmt', nome: 'Ex-comandante de unidade especializada ou multiemprego (≥ 1 ano)', cor: '#f08a1c', forma: 'capacete' },
  ];

  // Unidades cujo efetivo usa boina no 3º A (pedido do usuário: COESP, GPCIU, GBS e GAEPH)
  const obmsBoina = ['COESP', 'GPCIU', 'GBS', 'GAEPH'];

  const sangues = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const coresFita = [
    { id: 'verde', nome: 'Verde e amarelo', c: ['#1c7a3a', '#f2c200'] },
    { id: 'vermelho', nome: 'Vermelho e branco', c: ['#c8141e', '#ffffff'] },
    { id: 'azul', nome: 'Azul e branco', c: ['#1d3f8f', '#ffffff'] },
    { id: 'azulamarelo', nome: 'Azul e amarelo', c: ['#1d3f8f', '#f2c200'] },
    { id: 'vermbranco', nome: 'Vermelho e dourado', c: ['#c8141e', '#e0b22c'] },
    { id: 'verdebranco', nome: 'Verde e branco', c: ['#1c7a3a', '#ffffff'] },
    { id: 'roxo', nome: 'Roxo e branco', c: ['#5a2d82', '#ffffff'] },
    { id: 'preto', nome: 'Preto e vermelho', c: ['#222222', '#c8141e'] },
  ];

  return { postos, quadrosOficiais, qualificacoesPracas, cursosEsp, cursosCarreira, obms, obmsBoina, funcoes, sangues, coresFita };
})();
