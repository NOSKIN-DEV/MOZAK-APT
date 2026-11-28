# Mapa de eventos y ubicación marcada en el mapa (Etapa 16)

**Estado: implementado en la rama `feature/mapa-eventos`, sin compilar ni verificar.** El entorno de apoyo no pudo instalar Leaflet ni ejecutar `npm`, así que solo se comprobaron la lógica de distancias y su verificación de tipos estricta. Todo lo demás queda «pendiente de verificación» hasta que el usuario lo ejecute en su equipo (ver [`DEFINITION-OF-DONE.md`](DEFINITION-OF-DONE.md)).

Pedido del usuario del 28-11-2026: que la aplicación tenga una vista de mapa, al estilo de las apps de transporte o de navegación, con los eventos como puntos de interés, y que al tocar un punto aparezca la información del evento cercano. Además, que el creador no tenga que escribir latitud y longitud.

| Historia | Qué cubre | Puntos (propuesta) |
|---|---|---|
| HU-31 | Vista de mapa con los eventos publicados como puntos, ubicación del usuario y ficha al tocar un punto | 8 |
| HU-32 | El creador marca el lugar de un recinto nuevo tocando un mapa, en lugar de escribir coordenadas | 3 |

## Qué ve el público

Ruta `/mapa` (enlace «Mapa» en la cabecera):

- **Un punto por lugar**, con el número de eventos de ese lugar. Varios eventos en el mismo recinto quedan en un solo punto para que no se tapen.
- **Ubicación del usuario**: al abrir el mapa el navegador pide permiso; si se acepta, el mapa se centra en el punto azul del usuario. Si se rechaza o no está disponible, se muestra Santiago y un aviso.
- **Al tocar un punto** se abre una ficha abajo, como en las apps de transporte: nombre del lugar, comuna, distancia en línea recta desde el usuario y los eventos de ese lugar (categoría, fechas, horario, precio y «Ver detalle»), más el botón «Cómo llegar», que abre Google Maps.
- **«Lo más cercano»** selecciona el lugar con eventos más próximo al usuario. **«Mi ubicación»** vuelve a centrar el mapa en el usuario.
- Tocar una zona vacía del mapa cierra la ficha.

Solo se muestran eventos **publicados**: la vista usa la misma API pública que el listado (`GET /api/events`).

## Qué cambia para el creador

En «Nuevo evento → Lugar → Recinto nuevo» desaparecen los campos «Latitud» y «Longitud». En su lugar hay un mapa: se toca donde será el evento y el marcador se puede arrastrar para ajustarlo. El botón «Usar mi ubicación actual» sirve si el creador está en el lugar. Las coordenadas se siguen guardando igual que antes (con 6 decimales), así que **no hay cambios en la API, la base de datos ni la moderación**. Sin un punto marcado, el formulario no se envía.

## Cómo está hecho

| Pieza | Archivo | Nota |
|---|---|---|
| Distancias y agrupación por lugar | `src/lib/geo.ts` | Funciones puras con pruebas en `geo.test.ts`. Distancia en línea recta (semiverseno), no por calles |
| Configuración de Leaflet | `src/components/map/leaflet-setup.ts` | Teselas de OpenStreetMap y pines dibujados con CSS (`.mozak-pin` en `globals.css`) |
| Mapa de eventos | `src/components/map/EventsMap.tsx` | Pines, punto del usuario y movimientos del mapa |
| Vista completa | `src/components/map/MapExplorer.tsx`, `MapPage.tsx`, `src/app/mapa/page.tsx` | Ficha del lugar, botones y avisos |
| Selector del creador | `src/components/map/LocationPicker.tsx` y `src/components/panel/EventForm.tsx` | Toca o arrastra para marcar |

**Por qué Leaflet y OpenStreetMap:** son gratuitos y no requieren clave ni cuenta de facturación, igual que el resto del proyecto (RNF-08). Google Maps en la página exigiría una clave y una cuenta de facturación. El botón «Cómo llegar» sigue usando el enlace oficial de Google Maps, que no necesita clave.

**Dependencias nuevas** (versiones fijas en `package.json`): `leaflet` 1.9.4 y `@types/leaflet` 1.9.21. Hay que ejecutar `npm install` después de bajar esta rama.

## Privacidad

- La ubicación del usuario **se usa solo en su navegador** para centrar el mapa y calcular distancias. No se envía al servidor de MOZAK ni se guarda.
- Las imágenes del mapa (teselas) se descargan desde los servidores de OpenStreetMap, que reciben la dirección IP del visitante y la zona del mapa que está viendo.

## Limitaciones conocidas

- **Teselas de OpenStreetMap**: su política de uso permite un uso liviano con atribución. Para producción o tráfico real hay que usar un proveedor de teselas (varios tienen planes gratuitos con clave).
- **Hasta 100 eventos** en el mapa, que es el máximo de la API por petición. Con más eventos habrá que pedir solo los del área visible; eso es parte de la búsqueda por proximidad con PostGIS (HU-25).
- **Distancia en línea recta**, no por calles ni con tiempo de viaje.
- **Sin agrupación de puntos cercanos** (clusters): con muchos lugares juntos, los puntos se pueden superponer al alejar el mapa.
- **La ubicación del navegador solo funciona con https o en `localhost`.** En el teléfono, abrir `http://192.168.x.x:3000` no permite usarla; hay que probar con la dirección https de Vercel o en la aplicación Android.
- **Android (HU-27)**: para que la aplicación pida la ubicación, el `AndroidManifest.xml` que genera Capacitor debe declarar los permisos de ubicación. Está pendiente de probar junto con el APK.
- El mapa no cambia a modo oscuro.

## Cómo verificarlo (en el equipo del proyecto)

```
npm install
npm run lint
npm run test
npm run build
npm run dev
```

Prueba manual en `http://localhost:3000/mapa`:

- [ ] El navegador pide permiso de ubicación. Al aceptar, aparece el punto azul y el mapa se centra ahí.
- [ ] Al rechazarlo, aparece el aviso y el mapa muestra Santiago con todos los puntos.
- [ ] Los puntos muestran el número de eventos. Al tocar uno se abre la ficha con los eventos de ese lugar y la distancia.
- [ ] «Ver detalle» abre el evento y «Cómo llegar» abre Google Maps.
- [ ] «Lo más cercano» selecciona el lugar más próximo, y tocar una zona vacía cierra la ficha.
- [ ] En el teléfono (o con la vista móvil del navegador) la ficha queda abajo y los botones se pueden tocar.
- [ ] Como creador, en «Nuevo evento → Recinto nuevo», tocar el mapa pone el marcador, arrastrarlo lo mueve y «Usar mi ubicación actual» lo pone donde estás. Sin marcar el lugar, el formulario muestra «Marca en el mapa dónde será el evento.».
- [ ] Tras aprobarlo un administrador, el evento aparece como punto en `/mapa`.
