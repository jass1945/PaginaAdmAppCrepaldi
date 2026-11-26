
var URL_SUPABASE = 'https://dkcaievouhfeynyclvzj.supabase.co';
var CHAVE_SUPABASE = 'sb_publishable_x4W5Z3Rr0W9SIT_i-LNMhA_b_KkR3-S';

var banco = supabase.createClient(URL_SUPABASE, CHAVE_SUPABASE);

var abaAtual = 'motoristas';
var nomesMotoristas = {};

function limpar(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatarData(data) {
  if (!data) return '';
  var partes = String(data).slice(0, 10).split('-');
  return partes[2] + '/' + partes[1] + '/' + partes[0];
}

function nomeDoMotorista(id) {
  if (id === null || id === undefined) return '';
  return nomesMotoristas[id] || 'Motorista ' + id;
}

// BUSCAR TODOS OS REGISTROS PARA EXPORTAÇÃO
async function buscarTodosParaExcel(criarConsulta) {
  var todos = [];
  var inicio = 0;
  var tamanho = 1000;

  while (true) {
    var resposta = await criarConsulta().range(inicio, inicio + tamanho - 1);

    if (resposta.error) {
      throw resposta.error;
    }

    todos = todos.concat(resposta.data);

    if (resposta.data.length < tamanho) {
      break;
    }

    inicio += tamanho;
  }

  return todos;
}

// BUSCAR NOMES DOS MOTORISTAS
async function carregarNomes() {
  var resposta = await banco.from('login_usuario').select('id, nome');

  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  nomesMotoristas = {};

  for (var i = 0; i < resposta.data.length; i++) {
    nomesMotoristas[resposta.data[i].id] = resposta.data[i].nome;
  }
}

// LOGIN
async function entrar() {
  var email = document.getElementById('email').value.trim();
  var senha = document.getElementById('senha').value;
  var aviso = document.getElementById('aviso-login');

  aviso.textContent = '';

  var resposta = await banco.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (resposta.error) {
    aviso.textContent = 'Erro: ' + resposta.error.message;
    return;
  }

  var admin = await banco.rpc('is_admin');

  if (admin.data !== true) {
    await banco.auth.signOut();
    aviso.textContent = 'Este usuário não é administrador.';
    return;
  }

  document.getElementById('tela-login').style.display = 'none';
  document.getElementById('tela-painel').style.display = 'block';

  mostrarAba('viagens');
}

async function sair() {
  await banco.auth.signOut();

  document.getElementById('tela-painel').style.display = 'none';
  document.getElementById('tela-login').style.display = 'flex';
}

// TROCA DE ABAS
async function mostrarAba(nome) {
  abaAtual = nome;

  var abas = ['motoristas', 'veiculos', 'viagens', 'abastecidas'];

  for (var i = 0; i < abas.length; i++) {
    document.getElementById('aba-' + abas[i]).style.display = 'none';
  }

  document.getElementById('aba-' + nome).style.display = 'block';

  if (nome === 'motoristas') carregarMotoristas();
  if (nome === 'veiculos') carregarVeiculos();

  if (nome === 'viagens') {
    await carregarNomes();
    carregarViagens();
  }

  if (nome === 'abastecidas') {
    await carregarNomes();
    carregarAbastecidas();
  }
}

// INATIVAR / ATIVAR
async function mudarSituacao(tabela, id, ativoAgora) {
  var pergunta = ativoAgora ? 'Inativar este cadastro?' : 'Ativar este cadastro?';

  if (!confirm(pergunta)) return;

  var resposta = await banco
    .from(tabela)
    .update({ ativo: !ativoAgora })
    .eq('id', id);

  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  mostrarAba(abaAtual);
}

function textoSituacao(ativo) {
  if (ativo) return '<span class="verde">Ativo</span>';
  return '<span class="vermelho">Inativo</span>';
}

function botaoSituacao(tabela, id, ativo) {
  var texto = ativo ? 'Inativar' : 'Ativar';
  var classe = ativo ? 'btn-vermelho' : 'btn-verde';

  return '<button class="' + classe + '" onclick="mudarSituacao(\'' + tabela + '\', ' + id + ', ' + ativo + ')">' + texto + '</button>';
}

// MOTORISTAS
async function carregarMotoristas() {
  var resposta = await banco
    .from('login_usuario')
    .select('*')
    .order('nome');

  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  var html = '';

  for (var i = 0; i < resposta.data.length; i++) {
    var m = resposta.data[i];

    html += '<tr>';
    html += '<td>' + limpar(m.nome) + '</td>';
    html += '<td>' + limpar(m.cpf) + '</td>';
    html += '<td>' + limpar(m.unidade) + '</td>';
    html += '<td>' + limpar(m.periodo) + '</td>';
    html += '<td>' + textoSituacao(m.ativo) + '</td>';
    html += '<td>' + botaoSituacao('login_usuario', m.id, m.ativo) + '</td>';
    html += '</tr>';
  }

  document.getElementById('lista-motoristas').innerHTML = html;
}

async function adicionarMotorista() {
  var nome = document.getElementById('m-nome').value.trim();
  var cpf = document.getElementById('m-cpf').value.trim();
  var senha = document.getElementById('m-senha').value.trim();
  var unidade = document.getElementById('m-unidade').value.trim();
  var periodo = document.getElementById('m-periodo').value.trim();

  if (nome === '' || cpf === '' || senha === '') {
    alert('Preencha nome, CPF e senha.');
    return;
  }

  if (cpf.length !== 11) {
    alert('O CPF precisa ter 11 números.');
    return;
  }

  if (senha.length !== 4) {
    alert('A senha precisa ter 4 números.');
    return;
  }

  var resposta = await banco.from('login_usuario').insert({
    nome: nome,
    cpf: cpf,
    senha_hash: senha,
    unidade: unidade,
    periodo: periodo,
    ativo: true
  });

  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  document.getElementById('m-nome').value = '';
  document.getElementById('m-cpf').value = '';
  document.getElementById('m-senha').value = '';
  document.getElementById('m-unidade').value = '';
  document.getElementById('m-periodo').value = '';

  carregarMotoristas();
}

// VEÍCULOS
async function carregarVeiculos() {
  var resposta = await banco
    .from('veiculos')
    .select('*')
    .order('placa');

  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  var html = '';

  for (var i = 0; i < resposta.data.length; i++) {
    var v = resposta.data[i];

    html += '<tr>';
    html += '<td>' + limpar(v.placa) + '</td>';
    html += '<td>' + limpar(v.modelo) + '</td>';
    html += '<td>' + textoSituacao(v.ativo) + '</td>';
    html += '<td>' + botaoSituacao('veiculos', v.id, v.ativo) + '</td>';
    html += '</tr>';
  }

  document.getElementById('lista-veiculos').innerHTML = html;
}

async function adicionarVeiculo() {
  var placa = document.getElementById('v-placa').value.trim().toUpperCase();
  var modelo = document.getElementById('v-modelo').value.trim();

  if (placa === '') {
    alert('Informe a placa.');
    return;
  }

  var resposta = await banco.from('veiculos').insert({
    placa: placa,
    modelo: modelo,
    ativo: true
  });

  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  document.getElementById('v-placa').value = '';
  document.getElementById('v-modelo').value = '';

  carregarVeiculos();
}

// FILTRO DE DATAS
function limparFiltro(nome) {
  document.getElementById(nome + '-de').value = '';
  document.getElementById(nome + '-ate').value = '';

  if (nome === 'viagens') carregarViagens();
  if (nome === 'abastecidas') carregarAbastecidas();
}

// VIAGENS
async function carregarViagens() {
  var de = document.getElementById('viagens-de').value;
  var ate = document.getElementById('viagens-ate').value;

  if (de !== '' && ate !== '' && de > ate) {
    alert('A data inicial não pode ser maior que a final.');
    return;
  }

  var consulta = banco.from('nova_viagem').select('*');

  if (de !== '') consulta = consulta.gte('data_da_viagem', de);
  if (ate !== '') consulta = consulta.lte('data_da_viagem', ate);

  var resposta = await consulta
    .order('data_da_viagem', { ascending: false })
    .limit(200);

  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  var html = '';

  for (var i = 0; i < resposta.data.length; i++) {
    var v = resposta.data[i];

    var foto = 'Sem foto';

    if (v.foto_caminho) {
      var link = banco.storage
        .from('fotos-viagens')
        .getPublicUrl(v.foto_caminho).data.publicUrl;

      foto = '<button onclick="window.open(\'' + link + '\', \'_blank\')">Ver foto</button>';
    }

    html += '<tr>';
    html += '<td>' + formatarData(v.data_da_viagem) + '</td>';
    html += '<td>' + limpar(v.placa_do_veiculo) + '</td>';
    html += '<td>' + limpar(v.numero_viagem) + '</td>';
    html += '<td>' + limpar(v.valor_da_viagem) + '</td>';
    html += '<td>' + limpar(v.nome_do_produtor) + '</td>';
    html += '<td>' + limpar(nomeDoMotorista(v.motorista_id)) + '</td>';
    html += '<td>' + (v.cancelada ? 'Sim' : 'Não') + '</td>';
    html += '<td>' + foto + '</td>';
    html += '</tr>';
  }

  document.getElementById('lista-viagens').innerHTML = html;
}

// ABASTECIDAS
async function carregarAbastecidas() {
  var de = document.getElementById('abastecidas-de').value;
  var ate = document.getElementById('abastecidas-ate').value;

  if (de !== '' && ate !== '' && de > ate) {
    alert('A data inicial não pode ser maior que a final.');
    return;
  }

  var consulta = banco.from('abastecida').select('*');

  if (de !== '') consulta = consulta.gte('data', de);
  if (ate !== '') consulta = consulta.lte('data', ate);

  var resposta = await consulta
    .order('data', { ascending: false })
    .limit(200);

  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  var html = '';

  for (var i = 0; i < resposta.data.length; i++) {
    var a = resposta.data[i];

    html += '<tr>';
    html += '<td>' + formatarData(a.data) + '</td>';
    html += '<td>' + limpar(a.placa_do_veiculo) + '</td>';
    html += '<td>' + limpar(a.combustivel) + '</td>';
    html += '<td>' + limpar(a.litros_abastecidos) + '</td>';
    html += '<td>' + limpar(a.valor_pago) + '</td>';
    html += '<td>' + limpar(a.posto) + '</td>';
    html += '<td>' + limpar(nomeDoMotorista(a.motorista_id)) + '</td>';
    html += '</tr>';
  }

  document.getElementById('lista-abastecidas').innerHTML = html;
}

// EXPORTAR SOMENTE ABASTECIDAS
async function exportarAbastecidasExcel() {
  try {
    var de = document.getElementById('abastecidas-de').value;
    var ate = document.getElementById('abastecidas-ate').value;

    if (de !== '' && ate !== '' && de > ate) {
      alert('A data inicial não pode ser maior que a final.');
      return;
    }

    if (typeof XLSX === 'undefined') {
      alert('Biblioteca Excel não carregada.');
      return;
    }

    var dadosBrutos = await buscarTodosParaExcel(function() {
      var consulta = banco
        .from('abastecida')
        .select('data, placa_do_veiculo, combustivel, litros_abastecidos, valor_pago, posto, motorista_id')
        .order('data', { ascending: false });

      if (de !== '') consulta = consulta.gte('data', de);
      if (ate !== '') consulta = consulta.lte('data', ate);

      return consulta;
    });

    var respostaMotoristas = await banco
      .from('login_usuario')
      .select('id, nome');

    if (respostaMotoristas.error) {
      throw respostaMotoristas.error;
    }

    var nomes = {};

    respostaMotoristas.data.forEach(function(m) {
      nomes[m.id] = m.nome;
    });

    var dados = dadosBrutos.map(function(a) {
      return {
        Data: formatarData(a.data),
        Placa: a.placa_do_veiculo,
        Combustivel: a.combustivel,
        Litros: Number(a.litros_abastecidos) || 0,
        Valor: Number(a.valor_pago) || 0,
        Posto: a.posto,
        Motorista: nomes[a.motorista_id] || ''
      };
    });

    var planilha = XLSX.utils.book_new();
    var aba = XLSX.utils.json_to_sheet(dados);

    XLSX.utils.book_append_sheet(planilha, aba, 'Abastecidas');
    XLSX.writeFile(planilha, 'Relatorio_Abastecidas.xlsx');

    alert('Planilha de abastecidas exportada com sucesso!');

  } catch (erro) {
    console.error('Erro ao exportar abastecidas:', erro);
    alert('Erro ao exportar: ' + erro.message);
  }
}

// EXPORTAR SOMENTE VIAGENS
async function exportarViagensExcel() {
  try {
    var de = document.getElementById('viagens-de').value;
    var ate = document.getElementById('viagens-ate').value;

    if (de !== '' && ate !== '' && de > ate) {
      alert('A data inicial não pode ser maior que a final.');
      return;
    }

    if (typeof XLSX === 'undefined') {
      alert('Biblioteca Excel não carregada.');
      return;
    }

    var dadosBrutos = await buscarTodosParaExcel(function() {
      var consulta = banco
        .from('nova_viagem')
        .select('data_da_viagem, placa_do_veiculo, numero_viagem, valor_da_viagem, nome_do_produtor, motorista_id, cancelada')
        .order('data_da_viagem', { ascending: false });

      if (de !== '') consulta = consulta.gte('data_da_viagem', de);
      if (ate !== '') consulta = consulta.lte('data_da_viagem', ate);

      return consulta;
    });

    var respostaMotoristas = await banco
      .from('login_usuario')
      .select('id, nome');

    if (respostaMotoristas.error) {
      throw respostaMotoristas.error;
    }

    var nomes = {};

    respostaMotoristas.data.forEach(function(m) {
      nomes[m.id] = m.nome;
    });

    var dados = dadosBrutos.map(function(v) {
      return {
        Data: formatarData(v.data_da_viagem),
        Placa: v.placa_do_veiculo,
        Numero: v.numero_viagem,
        Valor: Number(v.valor_da_viagem) || 0,
        Produtor: v.nome_do_produtor,
        Motorista: nomes[v.motorista_id] || '',
        Cancelada: v.cancelada ? 'Sim' : 'Não'
      };
    });

    var planilha = XLSX.utils.book_new();
    var aba = XLSX.utils.json_to_sheet(dados);

    XLSX.utils.book_append_sheet(planilha, aba, 'Viagens');
    XLSX.writeFile(planilha, 'Relatorio_Viagens.xlsx');

    alert('Planilha de viagens exportada com sucesso!');

  } catch (erro) {
    console.error('Erro ao exportar viagens:', erro);
    alert('Erro ao exportar: ' + erro.message);
  }
}
