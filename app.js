
var URL_SUPABASE = 'https://dkcaievouhfeynyclvzj.supabase.co';
var CHAVE_SUPABASE = 'sb_publishable_x4W5Z3Rr0W9SIT_i-LNMhA_b_KkR3-S';

var banco = supabase.createClient(URL_SUPABASE, CHAVE_SUPABASE);

var abaAtual = 'motoristas';


function limpar(texto) {
  if (texto === null || texto === undefined) return '';
  return String(texto).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}


async function entrar() {
  var email = document.getElementById('email').value.trim();
  var senha = document.getElementById('senha').value;
  var aviso = document.getElementById('aviso-login');
  aviso.textContent = '';

  var resposta = await banco.auth.signInWithPassword({ email: email, password: senha });
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
  mostrarAba('motoristas');
}

async function sair() {
  await banco.auth.signOut();
  document.getElementById('tela-painel').style.display = 'none';
  document.getElementById('tela-login').style.display = 'flex';
}


function mostrarAba(nome) {
  abaAtual = nome;

  var abas = ['motoristas', 'veiculos', 'viagens', 'abastecidas'];
  for (var i = 0; i < abas.length; i++) {
    document.getElementById('aba-' + abas[i]).style.display = 'none';
  }
  document.getElementById('aba-' + nome).style.display = 'block';

  if (nome === 'motoristas') carregarMotoristas();
  if (nome === 'veiculos') carregarVeiculos();
  if (nome === 'viagens') carregarViagens();
  if (nome === 'abastecidas') carregarAbastecidas();
}


async function mudarSituacao(tabela, id, ativoAgora) {
  var pergunta = ativoAgora ? 'Inativar este cadastro?' : 'Ativar este cadastro?';
  if (!confirm(pergunta)) return;

  var resposta = await banco.from(tabela).update({ ativo: !ativoAgora }).eq('id', id);
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


async function carregarMotoristas() {
  var resposta = await banco.from('login_usuario').select('*').order('nome');
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


async function carregarVeiculos() {
  var resposta = await banco.from('veiculos').select('*').order('placa');
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


async function carregarViagens() {
  var resposta = await banco.from('nova_viagem').select('*').order('id', { ascending: false }).limit(200);
  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  var html = '';
  for (var i = 0; i < resposta.data.length; i++) {
    var v = resposta.data[i];

    var foto = '';
    if (v.foto_caminho) {
      var link = banco.storage.from('fotos-viagens').getPublicUrl(v.foto_caminho).data.publicUrl;
      foto = '<a href="' + link + '" target="_blank">Ver foto</a>';
    }

    html += '<tr>';
    html += '<td>' + limpar(v.data_da_viagem) + '</td>';
    html += '<td>' + limpar(v.placa_do_veiculo) + '</td>';
    html += '<td>' + limpar(v.numero_viagem) + '</td>';
    html += '<td>' + limpar(v.valor_da_viagem) + '</td>';
    html += '<td>' + limpar(v.nome_do_produtor) + '</td>';
    html += '<td>' + limpar(v.motorista_id) + '</td>';
    html += '<td>' + (v.cancelada ? 'Sim' : 'Não') + '</td>';
    html += '<td>' + foto + '</td>';
    html += '</tr>';
  }
  document.getElementById('lista-viagens').innerHTML = html;
}


async function carregarAbastecidas() {
  var resposta = await banco.from('abastecida').select('*').order('id', { ascending: false }).limit(200);
  if (resposta.error) {
    alert('Erro: ' + resposta.error.message);
    return;
  }

  var html = '';
  for (var i = 0; i < resposta.data.length; i++) {
    var a = resposta.data[i];
    html += '<tr>';
    html += '<td>' + limpar(a.data) + '</td>';
    html += '<td>' + limpar(a.placa_do_veiculo) + '</td>';
    html += '<td>' + limpar(a.combustivel) + '</td>';
    html += '<td>' + limpar(a.litros_abastecidos) + '</td>';
    html += '<td>' + limpar(a.valor_pago) + '</td>';
    html += '<td>' + limpar(a.posto) + '</td>';
    html += '<td>' + limpar(a.motorista_id) + '</td>';
    html += '</tr>';
  }
  document.getElementById('lista-abastecidas').innerHTML = html;
}
