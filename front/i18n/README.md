# Idiomas (EN / ES)

El motor `js/i18n.js` carga `i18n/en.json` o `i18n/es.json` y reemplaza los textos de la página.
El switch **EN | ES** del nav (y del menú lateral) cambia el idioma; la elección se guarda en el navegador.

Orden de prioridad del idioma: `?lang=es` en la URL → elección guardada → idioma del navegador → inglés.

## Cómo se marca el HTML

| Atributo | Qué traduce | Ejemplo |
|---|---|---|
| `data-i18n="clave"` | texto del elemento | `<a data-i18n="our_firm">Our firm</a>` |
| `data-i18n-html="clave"` | texto con etiquetas internas (`<span>`, `<a>`, `<br>`…) | `<h2 data-i18n-html="our_offices">Our <span>Offices</span></h2>` |
| `data-i18n-attr="attr:clave\|attr:clave"` | atributos: `alt`, `aria-label`, `placeholder`, `title`, `content` de meta | `<img alt="…" data-i18n-attr="alt:miami_skyline">` |
| `data-i18n-skip` | excluye un bloque | switch EN/ES |

`<title>`, `meta description`, `og:*` y `twitter:*` también llevan claves (prefijo `meta.`), así que cambian con el idioma.
`<html lang>` y `og:locale` (`en_US` / `es_MX`) se actualizan solos.

## Editar o agregar textos

1. Cambie el valor en **ambos** archivos (`en.json` y `es.json`) con la misma clave.
2. Para un texto nuevo: agregue el atributo en el HTML con una clave nueva y añádala a los dos JSON.
3. Si a `es.json` le falta una clave, se muestra el texto en inglés.
4. Las claves `js.*` son mensajes usados desde JavaScript (validaciones, estados de formularios, listas dinámicas).
   En JS: `AF_I18N.t('js.required')` o `AF_I18N.t('js.carousel_goto', { n: 1, total: 3 })`.

## Contenido de la API

Todas las peticiones envían el idioma (`?lang=` en GET, `lang` en el body de POST y el header `Accept-Language`).
La API devuelve las columnas `*_es` de la base de datos cuando el idioma es español (si están vacías, usa inglés)
y envía los correos al usuario (confirmación, bienvenida, restablecer contraseña) en su idioma.
Al cambiar de idioma, las páginas vuelven a pedir su contenido dinámico (`af:langchange`).

> Nota SEO: el cambio es del lado del cliente, en las mismas URLs. Los buscadores y las vistas previas de redes sociales
> leen la versión en inglés. Para indexar el español por separado se necesitarían URLs propias (`/es/…`) con `hreflang`.
