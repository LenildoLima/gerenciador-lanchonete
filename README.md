# 🍔 LaunchApp - Gestão de Lanchonete

O **LaunchApp** é um sistema de PDV (Ponto de Venda) moderno e intuitivo, desenvolvido para otimizar a operação de lanchonetes e pequenos estabelecimentos de alimentação. O sistema oferece controle completo de estoque, gestão de produtos, dashboard em tempo real e um fluxo especializado para pedidos de entrega (Delivery).

## 🚀 Funcionalidades Principais

- **Painel de Controle (Dashboard)**: Métricas em tempo real, gráficos de vendas dos últimos 7 dias e alertas inteligentes de estoque baixo.
- **Gestão de Produtos**: Catálogo completo com categorização, controle de custo/preço e saldo de estoque.
- **PDV (Nova Venda)**: Checkout rápido com suporte a pedidos locais e delivery (endereço, telefone e taxa de entrega automática).
- **Histórico de Vendas**: Relatórios com filtros por período (Dia, Semana, Mês) e totalizadores financeiros automáticos.
- **Interface Premium**: Navegação horizontal moderna, design responsivo e tabelas com cabeçalhos fixos (Sticky Headers).

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, Vite, TypeScript.
- **UI/UX**: Tailwind CSS, Shadcn UI, Lucide Icons.
- **Backend**: Supabase (PostgreSQL, Realtime, Edge Functions).
- **Métricas**: Recharts.

## 📦 Como Instalar e Rodar

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/gerenciador-lanchonete.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure as variáveis de ambiente do Supabase no arquivo `.env`.
4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🗄️ Configuração do Banco de Dados (Supabase)

Para o funcionamento completo do sistema, execute o seguinte SQL no seu editor do Supabase:

```sql
-- Tabelas Principais
CREATE TABLE public.produtos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  categoria text NOT NULL,
  preco numeric NOT NULL,
  custo numeric NOT NULL,
  estoque integer DEFAULT 0,
  estoque_minimo integer DEFAULT 5,
  ativo boolean DEFAULT true,
  criado_em timestamptz DEFAULT now()
);

CREATE TABLE public.vendas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  total numeric DEFAULT 0,
  forma_pagamento text,
  nome_cliente text,
  observacoes text,
  tipo_pedido text DEFAULT 'Local',
  endereco_entrega text,
  telefone_entrega text,
  taxa_entrega numeric DEFAULT 0,
  situacao text DEFAULT 'Concluída',
  criado_em timestamptz DEFAULT now()
);

CREATE TABLE public.itens_venda (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  venda_id uuid REFERENCES public.vendas(id) ON DELETE CASCADE,
  produto_id uuid REFERENCES public.produtos(id),
  nome_produto text,
  quantidade integer NOT NULL,
  preco_unitario numeric NOT NULL,
  subtotal numeric NOT NULL
);

-- Função de Venda Atômica (RPC)
CREATE OR REPLACE FUNCTION public.realizar_venda(
  p_itens jsonb,
  p_pagamento text,
  p_observacao text,
  p_cliente text,
  p_tipo_pedido text DEFAULT 'Local',
  p_endereco text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_taxa_entrega numeric DEFAULT 0
) RETURNS void AS $$
DECLARE
    v_venda_id uuid;
    v_item jsonb;
    v_total numeric := 0;
    v_preco numeric;
    v_nome_prod text;
BEGIN
    INSERT INTO public.vendas (forma_pagamento, observacoes, nome_cliente, tipo_pedido, endereco_entrega, telefone_entrega, taxa_entrega, situacao)
    VALUES (p_pagamento, p_observacao, p_cliente, p_tipo_pedido, p_endereco, p_telefone, p_taxa_entrega, 'Concluída')
    RETURNING id INTO v_venda_id;

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_itens) LOOP
        SELECT preco, nome INTO v_preco, v_nome_prod FROM public.produtos WHERE id = (v_item->>'produto_id')::uuid;
        INSERT INTO public.itens_venda (venda_id, produto_id, nome_produto, quantidade, preco_unitario, subtotal)
        VALUES (v_venda_id, (v_item->>'produto_id')::uuid, v_nome_prod, (v_item->>'quantidade')::int, v_preco, v_preco * (v_item->>'quantidade')::int);
        UPDATE public.produtos SET estoque = estoque - (v_item->>'quantidade')::int WHERE id = (v_item->>'produto_id')::uuid;
        v_total := v_total + (v_preco * (v_item->>'quantidade')::int);
    END LOOP;

    UPDATE public.vendas SET total = v_total + p_taxa_entrega WHERE id = v_venda_id;
END;
$$ LANGUAGE plpgsql;
```

---
*Desenvolvido com ❤️ para facilitar a gestão do seu negócio.*
