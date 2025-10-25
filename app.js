document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado. A iniciar aplicação...');
    
    const API_URL = 'http://localhost:3001/api';

    // --- Estado da Aplicação ---
    let listaCategorias = [], listaProdutos = [], listaPedidos = [], listaMesas = [], listaVendas = [];

    // --- Seleção de Elementos do DOM ---
    const getEl = id => document.getElementById(id);
    const queryAll = selector => document.querySelectorAll(selector);

    const elementos = {
        formCategoria: getEl('form-categoria'),
        formProduto: getEl('form-produto'),
        formMesa: getEl('form-mesa'),
        inputCategoriaId: getEl('categoria-id'),
        inputCategoriaNome: getEl('categoria-nome'),
        inputProdutoId: getEl('produto-id'),
        inputProdutoNome: getEl('produto-nome'),
        inputProdutoDesc: getEl('produto-descricao'),
        inputProdutoValor: getEl('produto-valor'),
        selectCategoria: getEl('select-categoria'),
        tabelaCategoriasBody: getEl('tabela-categorias-body'),
        tabelaProdutosBody: getEl('tabela-produtos-body'),
        tabelaMesasBody: getEl('tabela-mesas-body'),
        inputMesaId: getEl('mesa-id'),
        inputMesaNome: getEl('mesa-nome'),
        btnCancelarCategoria: getEl('btn-cancelar-categoria'),
        btnCancelarProduto: getEl('btn-cancelar-produto'),
        btnCancelarMesa: getEl('btn-cancelar-mesa'),
        btnNovoPedido: getEl('btn-novo-pedido'),
        modalCloseButtons: queryAll('.modal-close'),
        kanbanColunas: { aberto: getEl('coluna-aberto'), pago: getEl('coluna-pago'), cancelado: getEl('coluna-cancelado') },
        modalNovoPedido: getEl('modal-novo-pedido'),
        formNovoPedido: getEl('form-novo-pedido'),
        inputPedidoReferencia: getEl('pedido-referencia'),
        modalDetalhesPedido: getEl('modal-detalhes-pedido'),
        modalDetalhesTitulo: getEl('modal-detalhes-titulo'),
        modalDetalhesItens: getEl('modal-detalhes-itens'),
        modalDetalhesTotal: getEl('modal-detalhes-total'),
        formAddItemDetalhes: getEl('form-add-item-detalhes'),
        selectAddProdutoDetalhes: getEl('select-add-produto-detalhes'),
        inputAddItemDetalhesQuantidade: getEl('add-item-detalhes-quantidade'),
        inputAddItemDetalhesPedidoId: getEl('add-item-detalhes-pedido-id'),
        navLinks: queryAll('.sidebar .nav-link'),
        pages: queryAll('.main-content .page'),
        modalQrCode: getEl('modal-qrcode'),
        qrcodeContainer: getEl('qrcode-container'),
        qrcodeTitle: getEl('qrcode-title'),
        formFiltroCaixa: getEl('form-filtro-caixa'),
        filtroDataInicio: getEl('filtro-data-inicio'),
        filtroDataFim: getEl('filtro-data-fim'),
        btnLimparFiltrosCaixa: getEl('btn-limpar-filtros-caixa'),
        tabelaVendasBody: getEl('tabela-vendas-body'),
        totalVendasPeriodo: getEl('total-vendas-periodo')
    };

    // --- Funções Auxiliares ---
    const formatCurrency = value => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const formatDate = dateStr => new Date(dateStr).toLocaleString('pt-BR');
    const openModal = id => getEl(id).style.display = 'flex';
    const closeModal = id => getEl(id).style.display = 'none';

    // --- Funções de API ---
    const fetchData = async (endpoint, options = {}) => {
        try {
            const res = await fetch(`${API_URL}${endpoint}`, options);
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || `Erro HTTP: ${res.status}`);
            }
            return res.status === 204 ? {} : res.json();
        } catch (error) {
            console.error(`Erro na API (${endpoint}):`, error);
            alert(`Erro: ${error.message}`);
            throw error;
        }
    };
    
    // --- Funções de Renderização ---
    const renderCategorias = () => {
        elementos.tabelaCategoriasBody.innerHTML = '';
        elementos.selectCategoria.innerHTML = '<option value="">-- Selecione uma categoria --</option>';
        listaCategorias.forEach(c => {
            const tr = `<tr><td>${c.nome}</td><td><button class="btn-tabela btn-edit" data-id="${c.id}">Editar</button><button class="btn-tabela btn-delete" data-id="${c.id}">Excluir</button></td></tr>`;
            elementos.tabelaCategoriasBody.insertAdjacentHTML('beforeend', tr);
            elementos.selectCategoria.appendChild(new Option(c.nome, c.id));
        });
    };

    const renderProdutos = () => {
        elementos.tabelaProdutosBody.innerHTML = '';
        elementos.selectAddProdutoDetalhes.innerHTML = '<option value="">-- Selecione um produto --</option>';
        listaProdutos.forEach(p => {
            const tr = `<tr><td>${p.nome}</td><td>${p.categoria_nome || 'N/A'}</td><td>${formatCurrency(p.valor)}</td><td>${p.ativo ? 'Ativo' : 'Inativo'}</td><td><button class="btn-tabela btn-edit" data-id="${p.id}">Editar</button><button class="btn-tabela btn-toggle" data-id="${p.id}" data-ativo="${p.ativo}">${p.ativo ? 'Desativar' : 'Ativar'}</button><button class="btn-tabela btn-delete" data-id="${p.id}">Excluir</button></td></tr>`;
            elementos.tabelaProdutosBody.insertAdjacentHTML('beforeend', tr);
            if (p.ativo) {
                elementos.selectAddProdutoDetalhes.appendChild(new Option(`${p.nome} (${formatCurrency(p.valor)})`, p.id));
            }
        });
    };

    const renderMesas = () => {
        elementos.tabelaMesasBody.innerHTML = '';
        listaMesas.forEach(m => {
            const tr = `<tr><td>${m.nome}</td><td style="width: 220px;"><button class="btn-tabela btn-edit" data-id="${m.id}">Editar</button><button class="btn-tabela btn-delete" data-id="${m.id}">Excluir</button><button class="btn-tabela btn-card-detalhes" data-nome="${m.nome}">Gerar QR</button></td></tr>`;
            elementos.tabelaMesasBody.insertAdjacentHTML('beforeend', tr);
        });
    };

    const renderPedidos = () => {
        Object.values(elementos.kanbanColunas).forEach(col => col.innerHTML = '');
        listaPedidos.forEach(pedido => {
            let actions = '';
            if (pedido.status === 'ABERTO') {
                actions = `<button class="btn-card btn-card-detalhes" data-id="${pedido.id}">Ver/Editar</button><button class="btn-card btn-card-pagar" data-id="${pedido.id}" data-total="${pedido.valor_total || 0}">Finalizar</button><button class="btn-card btn-card-cancelar" data-id="${pedido.id}">Cancelar</button>`;
            } else {
                actions = `<button class="btn-card btn-card-detalhes" data-id="${pedido.id}">Ver Detalhes</button><button class="btn-card btn-card-reabrir" data-id="${pedido.id}">Reabrir</button>`;
            }
            const cardHTML = `<div class="kanban-card"><h4>${pedido.referencia} (ID: ${pedido.id})</h4><p>Aberto em: ${formatDate(pedido.data_abertura)}</p><p class="kanban-card-total">${formatCurrency(pedido.valor_total)}</p><div class="kanban-card-actions">${actions}</div></div>`;
            const colunaKey = pedido.status.toLowerCase();
            if (elementos.kanbanColunas[colunaKey]) elementos.kanbanColunas[colunaKey].insertAdjacentHTML('beforeend', cardHTML);
        });
    };

    const renderVendas = () => {
        elementos.tabelaVendasBody.innerHTML = '';
        let totalPeriodo = 0;
        if (listaVendas.length === 0) {
            elementos.tabelaVendasBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhuma venda encontrada para este período.</td></tr>'; // Colspan atualizado para 6
        } else {
            listaVendas.forEach(venda => {
                totalPeriodo += venda.valor_total;
                // Formata a lista de itens
                const itensVendidosHTML = venda.itens && venda.itens.length > 0
                    ? `<div class="itens-vendidos-lista">${venda.itens.map(item => `<span>${item.quantidade}x ${item.produto_nome}</span>`).join('')}</div>`
                    : '<span>N/A</span>';

                const tr = `<tr>
                                <td>${formatDate(venda.data_venda)}</td>
                                <td>${venda.pedido_referencia || venda.pedido_id}</td>
                                <td>${itensVendidosHTML}</td> 
                                <td>${formatCurrency(venda.valor_total)}</td>
                                <td>${venda.tipo_pagamento}</td>
                                <td>
                                    <button class="btn-tabela btn-edit" data-id="${venda.id}" data-tipo-pagamento="${venda.tipo_pagamento}">Editar</button>
                                    <button class="btn-tabela btn-delete" data-id="${venda.id}">Excluir</button>
                                </td>
                            </tr>`;
                elementos.tabelaVendasBody.insertAdjacentHTML('beforeend', tr);
            });
        }
        elementos.totalVendasPeriodo.textContent = formatCurrency(totalPeriodo);
    };

    // --- Lógica Principal ---
    const loadInitialData = async () => {
        try {
            [listaCategorias, listaProdutos, listaMesas] = await Promise.all([ fetchData('/categorias'), fetchData('/produtos'), fetchData('/mesas') ]);
            renderCategorias(); renderProdutos(); renderMesas();
            console.log("Dados iniciais carregados.");
        } catch (e) { console.error("Falha ao carregar dados iniciais.", e); }
    };
    
    const showPage = async (pageId) => {
        elementos.pages.forEach(p => p.classList.remove('active'));
        getEl(pageId)?.classList.add('active');
        elementos.navLinks.forEach(link => { link.classList.toggle('active', link.dataset.page === pageId); });
        
        if (pageId === 'page-pedidos') { await carregarPedidos(); }
        if (pageId === 'page-caixa') { await carregarVendas(); }
    };

    const carregarPedidos = async () => { listaPedidos = await fetchData('/pedidos'); renderPedidos(); };
    const carregarVendas = async (dataInicio = '', dataFim = '') => {
        let endpoint = '/vendas';
        const params = new URLSearchParams();
        if (dataInicio) params.append('data_inicio', dataInicio);
        if (dataFim) params.append('data_fim', dataFim);
        if (params.toString()) endpoint += `?${params.toString()}`;
        
        listaVendas = await fetchData(endpoint);
        renderVendas();
    };

    const abrirModalDetalhes = async (id) => {
        try {
            const pedido = await fetchData(`/pedidos/${id}`);
            elementos.modalDetalhesTitulo.textContent = `Detalhes: ${pedido.referencia} (ID: ${id})`;
            elementos.modalDetalhesTotal.textContent = formatCurrency(pedido.valor_total);
            elementos.inputAddItemDetalhesPedidoId.value = id;
            elementos.modalDetalhesItens.innerHTML = pedido.itens.length === 0 ? '<li>Nenhum item neste pedido.</li>' : '';
            pedido.itens.forEach(item => {
                const li = document.createElement('li');
                li.innerHTML = `<div class="item-info">${item.quantidade}x ${item.produto_nome} <span>(${formatCurrency(item.valor_unitario_registro)} cada)</span></div><div class="item-preco">${formatCurrency(item.valor_unitario_registro * item.quantidade)}${pedido.status === 'ABERTO' ? `<button class="btn-tabela btn-delete" data-pedido-id="${id}" data-item-id="${item.id}" style="margin-left: 10px;">&times;</button>` : ''}</div>`;
                elementos.modalDetalhesItens.appendChild(li);
            });
            elementos.formAddItemDetalhes.style.display = pedido.status === 'ABERTO' ? 'flex' : 'none';
            openModal('modal-detalhes-pedido');
        } catch (e) { console.error("Falha ao abrir detalhes do pedido.", e); }
    };
    
    const bindEventListeners = () => {
        // Navegação
        elementos.navLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); showPage(e.target.dataset.page); }));
        
        // Modais
        elementos.btnNovoPedido.addEventListener('click', () => openModal('modal-novo-pedido'));
        elementos.modalCloseButtons.forEach(btn => btn.addEventListener('click', (e) => closeModal(e.target.dataset.modalId)));
        
        // --- FORMS DE SUBMISSÃO ---
        elementos.formCategoria.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = elementos.inputCategoriaId.value;
            const nome = elementos.inputCategoriaNome.value;
            const metodo = id ? 'PUT' : 'POST';
            const endpoint = id ? `/categorias/${id}` : '/categorias';
            await fetchData(endpoint, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) });
            elementos.formCategoria.reset(); elementos.inputCategoriaId.value = ''; elementos.btnCancelarCategoria.style.display = 'none';
            await loadInitialData();
        });
        
        elementos.formProduto.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = elementos.inputProdutoId.value;
            const payload = { nome: elementos.inputProdutoNome.value, descricao: elementos.inputProdutoDesc.value, valor: parseFloat(elementos.inputProdutoValor.value), categoria_id: parseInt(elementos.selectCategoria.value) };
            const metodo = id ? 'PUT' : 'POST';
            const endpoint = id ? `/produtos/${id}` : '/produtos';
            await fetchData(endpoint, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            elementos.formProduto.reset(); elementos.inputProdutoId.value = ''; elementos.btnCancelarProduto.style.display = 'none';
            await loadInitialData();
        });

        elementos.formMesa.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = elementos.inputMesaId.value;
            const nome = elementos.inputMesaNome.value;
            const metodo = id ? 'PUT' : 'POST';
            const endpoint = id ? `/mesas/${id}` : '/mesas';
            await fetchData(endpoint, { method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) });
            elementos.formMesa.reset(); elementos.inputMesaId.value = ''; elementos.btnCancelarMesa.style.display = 'none';
            await loadInitialData(); // Recarrega mesas também
        });

        elementos.formNovoPedido.addEventListener('submit', async (e) => {
            e.preventDefault();
            const referencia = elementos.inputPedidoReferencia.value;
            if (!referencia) return;
            await fetchData('/pedidos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ referencia }) });
            elementos.formNovoPedido.reset(); closeModal('modal-novo-pedido');
            await showPage('page-pedidos');
        });

        elementos.formAddItemDetalhes.addEventListener('submit', async (e) => {
            e.preventDefault();
            const pedidoId = elementos.inputAddItemDetalhesPedidoId.value;
            const produto_id = elementos.selectAddProdutoDetalhes.value;
            const quantidade = elementos.inputAddItemDetalhesQuantidade.value;
            if (!pedidoId || !produto_id || !quantidade) return alert('Selecione um produto e a quantidade.');
            await fetchData(`/pedidos/${pedidoId}/itens`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ produto_id, quantidade }) });
            elementos.formAddItemDetalhes.reset(); elementos.inputAddItemDetalhesQuantidade.value = 1;
            await abrirModalDetalhes(pedidoId); await carregarPedidos();
        });

        // Fluxo de Caixa Filtros
        elementos.formFiltroCaixa.addEventListener('submit', (e) => {
            e.preventDefault();
            carregarVendas(elementos.filtroDataInicio.value, elementos.filtroDataFim.value);
        });
        elementos.btnLimparFiltrosCaixa.addEventListener('click', () => {
            elementos.formFiltroCaixa.reset();
            carregarVendas();
        });

        // Botões de Cancelar Edição
        elementos.btnCancelarCategoria.addEventListener('click', () => { elementos.formCategoria.reset(); elementos.inputCategoriaId.value = ''; elementos.btnCancelarCategoria.style.display = 'none'; });
        elementos.btnCancelarProduto.addEventListener('click', () => { elementos.formProduto.reset(); elementos.inputProdutoId.value = ''; elementos.btnCancelarProduto.style.display = 'none'; });
        elementos.btnCancelarMesa.addEventListener('click', () => { elementos.formMesa.reset(); elementos.inputMesaId.value = ''; elementos.btnCancelarMesa.style.display = 'none'; });
        
        // Delegação de eventos para tabelas e kanban
        document.body.addEventListener('click', async (e) => {
            const target = e.target;
            const id = target.dataset.id;

            // Tabela Categorias
            if (target.matches('#tabela-categorias-body .btn-edit')) {
                const cat = listaCategorias.find(c => c.id == id);
                if (cat) { elementos.inputCategoriaId.value = cat.id; elementos.inputCategoriaNome.value = cat.nome; elementos.btnCancelarCategoria.style.display = 'block'; }
            } else if (target.matches('#tabela-categorias-body .btn-delete')) {
                if (confirm('Tem a certeza?')) { await fetchData(`/categorias/${id}`, { method: 'DELETE' }); await loadInitialData(); }
            }

            // Tabela Produtos
            if (target.matches('#tabela-produtos-body .btn-edit')) {
                const prod = listaProdutos.find(p => p.id == id);
                if (prod) { elementos.inputProdutoId.value = prod.id; elementos.inputProdutoNome.value = prod.nome; elementos.inputProdutoDesc.value = prod.descricao; elementos.inputProdutoValor.value = prod.valor; elementos.selectCategoria.value = prod.categoria_id; elementos.btnCancelarProduto.style.display = 'block'; }
            } else if (target.matches('#tabela-produtos-body .btn-delete')) {
                if (confirm('Tem a certeza?')) { await fetchData(`/produtos/${id}`, { method: 'DELETE' }); await loadInitialData(); }
            } else if (target.matches('#tabela-produtos-body .btn-toggle')) {
                const novoStatus = !(target.dataset.ativo === 'true');
                await fetchData(`/produtos/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ativo: novoStatus }) });
                await loadInitialData();
            }

            // Tabela Mesas
            if (target.matches('#tabela-mesas-body .btn-edit')) {
                const mesa = listaMesas.find(m => m.id == id);
                if (mesa) { elementos.inputMesaId.value = mesa.id; elementos.inputMesaNome.value = mesa.nome; elementos.btnCancelarMesa.style.display = 'block'; }
            } else if (target.matches('#tabela-mesas-body .btn-delete')) {
                if (confirm('Tem a certeza?')) { await fetchData(`/mesas/${id}`, { method: 'DELETE' }); await loadInitialData(); }
            } else if (target.matches('#tabela-mesas-body .btn-card-detalhes')) { // Botão Gerar QR
                const nomeMesa = target.dataset.nome;
                elementos.qrcodeTitle.textContent = `QR Code para: ${nomeMesa}`;
                elementos.qrcodeContainer.innerHTML = '';
                new QRCode(elementos.qrcodeContainer, { text: `${window.location.origin}/cardapio.html?mesa=${encodeURIComponent(nomeMesa)}`, width: 256, height: 256 });
                openModal('modal-qrcode');
            }
            
            // Kanban Cards
            if (target.matches('.kanban-card-actions .btn-card')) {
                const cardId = target.dataset.id;
                if (target.classList.contains('btn-card-detalhes')) { await abrirModalDetalhes(cardId); }
                else if (target.classList.contains('btn-card-pagar')) {
                    const total = parseFloat(target.dataset.total);
                    const tipoPagamento = prompt("Forma de pagamento?", "PIX");
                    if (tipoPagamento) { await fetchData(`/pedidos/${cardId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'PAGO', valor_total: total, tipo_pagamento: tipoPagamento }) }); await showPage('page-pedidos'); }
                } else if (target.classList.contains('btn-card-cancelar')) {
                    if (confirm('Tem a certeza?')) { await fetchData(`/pedidos/${cardId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'CANCELADO' }) }); await showPage('page-pedidos'); }
                } else if (target.classList.contains('btn-card-reabrir')) {
                    if (confirm('Tem a certeza?')) { await fetchData(`/pedidos/${cardId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'ABERTO' }) }); await showPage('page-pedidos'); }
                }
            }

            // Remover item no Modal de Detalhes
            if (target.matches('#modal-detalhes-itens .btn-delete')) {
                const pedidoId = target.dataset.pedidoId;
                const itemId = target.dataset.itemId;
                if (confirm('Remover este item?')) { await fetchData(`/pedidos/${pedidoId}/itens/${itemId}`, { method: 'DELETE' }); await abrirModalDetalhes(pedidoId); await carregarPedidos(); }
            }

            // Tabela Vendas (Fluxo de Caixa)
            if (target.matches('#tabela-vendas-body .btn-edit')) {
                 const vendaId = target.dataset.id;
                 const tipoAtual = target.dataset.tipoPagamento;
                 const novoTipo = prompt("Editar tipo de pagamento:", tipoAtual);
                 if (novoTipo && novoTipo !== tipoAtual) {
                     await fetchData(`/vendas/${vendaId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo_pagamento: novoTipo }) });
                     await carregarVendas(elementos.filtroDataInicio.value, elementos.filtroDataFim.value);
                 }
            } else if (target.matches('#tabela-vendas-body .btn-delete')) {
                if (confirm('Tem a certeza ABSOLUTA que deseja EXCLUIR esta venda?\nEsta ação NÃO PODE ser desfeita e afetará os relatórios financeiros.')) {
                    await fetchData(`/vendas/${id}`, { method: 'DELETE' });
                    await carregarVendas(elementos.filtroDataInicio.value, elementos.filtroDataFim.value);
                }
            }
        });
        
        console.log("Todos os eventos foram registados.");
    };

    // --- Inicialização ---
    const init = () => {
        bindEventListeners();
        loadInitialData();
        showPage('page-cardapio');
    };

    init();
});

