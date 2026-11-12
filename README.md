# Mascotes do Painel de Ponto

Mascotes feitos pela comunidade para o Painel de Ponto. Um mascote é só uma pasta com imagens PNG e um
`mascote.json`: não tem código.

Você pode usar um mascote de dois jeitos:

- **Só no seu computador:** no app, abra Configurações › Personagem › **Adicionar mascote…** e escolha o `.zip`
  ou o `mascote.json` de dentro da pasta. Não precisa enviar nada para cá.
- **Para todo mundo:** envie uma PR com a pasta do mascote. Depois de aprovado, ele entra no app numa versão nova.

![Gato laranja](mascotes/gato-laranja/parado.png)

## Formato (versão 1)

```
mascotes/gato-laranja/
  mascote.json
  parado.png      obrigatória
  falando.png     opcional
  piscando.png    opcional
  feliz.png       opcional
  preocupado.png  opcional
  dormindo.png    opcional
  bravo.png       opcional
```

`mascote.json`:

```json
{
  "formato": 1,
  "nome": "Gato laranja",
  "autor": "Seu nome ou apelido",
  "licenca": "MIT"
}
```

| Imagem | Quando aparece |
| --- | --- |
| `parado.png` | Sempre que não houver outra pose para o momento |
| `falando.png` | Alterna com `parado.png` enquanto o balão aparece (boca mexendo) |
| `piscando.png` | De vez em quando, por um instante (olhos fechados) |
| `feliz.png` | Almoço, comemoração, água bebida |
| `preocupado.png` | Avisos de atenção, espiando atrás do painel, sendo arrastado |
| `dormindo.png` | Fim do expediente, tontura |
| `bravo.png` | Quando clicam nele muitas vezes seguidas |

Se faltar uma pose, o app usa `parado.png` no lugar.

### Regras

- Só PNG, com transparência. Desenhe o personagem **de pé, encostado na base da imagem**: o app alinha a imagem
  pelo chão.
- Todas as poses com o mesmo tamanho. De 16 a 1024 px de cada lado (algo como 200 × 260 fica bom).
- Até 1 MB por imagem e 5 MB no total.
- Na pasta só entram o `mascote.json`, as imagens da tabela e, se quiser, `README.md`, `LICENSE` ou `.txt`.
  Qualquer outro arquivo faz o pacote ser recusado.
- Nada de personagens de outras pessoas ou empresas (desenhos, marcas, personagens famosos), e nada impróprio para
  o trabalho.

## Enviar o seu

1. Faça um fork deste repositório.
2. Crie a pasta `mascotes/<nome-do-mascote>` (minúsculas e hífen) com o `mascote.json` e as imagens.
3. Confira: `node ferramentas/checar.js mascotes/<nome-do-mascote>` (precisa do Node 18 ou mais novo).
4. Abra a PR. A checagem automática roda sozinha; depois, a revisão de uma pessoa decide se ele entra.

A PR deve mexer só na pasta do seu mascote.

## Licença

As ferramentas usam a licença MIT (veja [LICENSE](LICENSE)). Cada mascote usa a licença escrita no próprio
`mascote.json`.
