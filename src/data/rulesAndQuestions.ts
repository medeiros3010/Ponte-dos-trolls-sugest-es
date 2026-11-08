export interface MembershipQuestion {
  id: number;
  pergunta: string;
  guiaAvaliacao: string; // Visível SOMENTE ao Mestre
}

export interface RulesConfig {
  version: string;
  updatedAt: string;
  textoRegras: string;
  termoAceite: string;
  perguntas: MembershipQuestion[];
}

export const DEFAULT_RULES_TEXT = `Bem-vindo à Ponte dos Trolls!

Criada em 2023, a Ponte dos Trolls é uma comunidade de compras coletivas de materiais digitais para RPG, como mapas, tokens, assets, livros e módulos.

Nosso objetivo é tornar as compras mais acessíveis por meio da divisão dos custos entre os interessados. O acesso aos materiais adquiridos é destinado aos participantes da respectiva compra, respeitando as condições de uso e compartilhamento de cada conteúdo.

Nossa história

Entre 2023 e 2024, adquirimos conteúdos variados de plataformas como Patreon e DriveThruRPG. A partir de 2024, passamos a priorizar também módulos oficiais para Foundry VTT.

Os materiais são organizados no Google Drive. As atualizações são disponibilizadas conforme sua existência e as condições de acesso da compra.

Como funciona a comunidade

A Ponte dos Trolls é colaborativa: participar do grupo não dá acesso automático a todo o acervo. Cada pessoa tem acesso aos materiais das compras das quais participa ou que adquire posteriormente.

Canais no WhatsApp

Os três canais obrigatórios são:

• Ponte dos Trolls - Geral: convivência e bate-papo principal.
• Ponte dos Trolls - Financiamentos: anúncios e acompanhamento das compras coletivas.
• Sugestões PDT: links e ideias de materiais para futuras compras.

Os canais opcionais são:

• Trolls da Cultura: Pathfinder.
• Trolls da Costa: D&D e derivados.
• Trolls Hipsters: outros sistemas de RPG.

Como funciona o financiamento

Normalmente, publicamos cerca de três propostas de compra por mês, conforme as sugestões e o interesse dos membros.

Cada proposta apresenta o material, os itens inclusos, o custo estimado, o mínimo de participantes e os prazos.

A inscrição é feita pelo botão de participação no site. Ao entrar no financiamento, você assume o compromisso de pagar caso a compra avance para a etapa de pagamento.

O prazo padrão é de cinco dias para inscrição e cinco dias para pagamento. Confira sempre as datas informadas em cada financiamento: elas são a referência para aquela compra.

A cota costuma ficar em torno de até R$ 15 por pessoa, mas esse valor não é um teto garantido. O valor final depende do material e do rateio. Na etapa de pagamento, confira o valor definitivo e o prazo publicados pelo Mestre.

O pagamento é feito por Pix, usando a chave exibida no site. Na descrição do Pix, informe seu telefone cadastrado para facilitar a identificação.

Depois de realizar o Pix no aplicativo do banco, volte ao site e informe que pagou. Clicar nesse botão é uma declaração sua; não representa conferência bancária automática.

Após a conferência e a liberação pelo responsável, o acesso será disponibilizado pelo Google Drive. Você poderá consultar seus materiais na área “Meus itens”.

Regras de acesso e compartilhamento

• Os materiais são de uso exclusivo dos participantes da respectiva compra.
• É proibido repassar arquivos ou links de acesso a terceiros, inclusive a membros do grupo que não participaram daquela compra.
• É proibido compartilhar materiais brasileiros no grupo ou no acervo da Ponte dos Trolls. Não envie, solicite ou disponibilize cópias desses materiais por nossos canais.
• Respeite as licenças e condições de uso dos conteúdos.

Compromisso, prazos e strikes

• Ao entrar em um financiamento, você assume um compromisso com os demais participantes.
• Se participar e não pagar até o prazo, receberá um strike.
• O descumprimento das regras gerais também pode gerar strike.
• Ao acumular três strikes, o membro ficará impedido de participar das compras por um ano.
• A aplicação e o acompanhamento das medidas são feitos pelo Mestre.

Convivência

• Racismo, preconceito, xenofobia, homofobia e machismo são proibidos.
• Não discutir política ou religião nos canais do grupo.
• Não provocar rivalidades ou hostilizar pessoas por suas preferências de sistemas de RPG.
• Não divulgar publicamente o grupo ou seus links de convite. Novas entradas passam pela avaliação do Mestre.
• Trate todos com respeito e educação.

Manutenção anual

A contribuição anual de manutenção é obrigatória e tem valor máximo de R$ 10,00 por pessoa.

O valor e o prazo serão comunicados pelo Mestre. Quem não contribuir dentro do prazo informado será removido do grupo.

Solicitação de entrada

Leia as regras e responda às perguntas com suas próprias palavras. Depois, preencha seus dados e envie a solicitação.

O Mestre analisará suas respostas e seu cadastro. O envio não libera acesso automático: você só poderá entrar no site após a aprovação. A entrada nos canais do WhatsApp será orientada pelo responsável.`;

export const DEFAULT_TERMO_ACEITE = 'Li, compreendi e concordo com as regras da Ponte dos Trolls.';

export const LEGACY_QUESTIONS_V1: MembershipQuestion[] = [
  {
    id: 1,
    pergunta: 'Qual é o prazo padrão para colocar seu nome em um financiamento e onde você confere a data válida daquela compra?',
    guiaAvaliacao: 'Cinco dias como padrão; consultar a data do financiamento.',
  },
  {
    id: 2,
    pergunta: 'O que acontece se você entrar em um financiamento e não pagar no prazo? E o que acontece ao acumular três strikes?',
    guiaAvaliacao: 'Um strike por falta de pagamento; três strikes geram impedimento de participar das compras por um ano.',
  },
  {
    id: 3,
    pergunta: 'Você pode compartilhar os materiais ou os links de acesso com amigos de fora do grupo ou com membros que não participaram da compra?',
    guiaAvaliacao: 'Não, em nenhum dos dois casos.',
  },
  {
    id: 4,
    pergunta: 'Quais são os três canais obrigatórios da Ponte dos Trolls?',
    guiaAvaliacao: 'Ponte dos Trolls - Geral, Ponte dos Trolls - Financiamentos e Sugestões PDT.',
  },
  {
    id: 5,
    pergunta: 'Qual é o valor habitual aproximado de uma cota? Esse valor é um limite garantido? Onde você confere o valor definitivo?',
    guiaAvaliacao: 'Em torno de até R$ 15, sem teto garantido; conferir o valor final na etapa de pagamento.',
  },
  {
    id: 6,
    pergunta: 'É permitido compartilhar materiais brasileiros no grupo ou no acervo?',
    guiaAvaliacao: 'Não.',
  },
  {
    id: 7,
    pergunta: 'O que você deve informar na descrição do Pix e o que precisa fazer no site depois de pagar?',
    guiaAvaliacao: 'Telefone cadastrado na descrição; depois informar o pagamento no site.',
  },
  {
    id: 8,
    pergunta: 'A manutenção anual é obrigatória? Qual é o valor máximo e o que acontece se você não contribuir?',
    guiaAvaliacao: 'Sim; até R$ 10 por ano; remoção do grupo se não contribuir no prazo comunicado.',
  },
];

export const DEFAULT_QUESTIONS: MembershipQuestion[] = [
  {
    id: 1,
    pergunta: 'Qual é o prazo padrão para colocar seu nome em um financiamento?',
    guiaAvaliacao: 'Cinco dias.',
  },
  {
    id: 2,
    pergunta: 'O que acontece se você entrar em um financiamento e não pagar no prazo?',
    guiaAvaliacao: 'Recebe um strike.',
  },
  {
    id: 3,
    pergunta: 'Você pode compartilhar os materiais ou os links de acesso com amigos de fora do grupo ou com membros que não participaram da compra?',
    guiaAvaliacao: 'Não, nos dois casos.',
  },
  {
    id: 4,
    pergunta: 'É permitido compartilhar materiais brasileiros no grupo ou no acervo?',
    guiaAvaliacao: 'Não.',
  },
];

export const INITIAL_RULES_CONFIG: RulesConfig = {
  version: '2.0.0',
  updatedAt: '2026-11-08T16:00:00.000Z',
  textoRegras: DEFAULT_RULES_TEXT,
  termoAceite: DEFAULT_TERMO_ACEITE,
  perguntas: DEFAULT_QUESTIONS,
};
