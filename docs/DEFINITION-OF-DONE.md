# Definition of Done — MOZAK (APT)

> Criterios para dar una historia, un sprint y una entrega por terminados. Parte de la definición vigente en la planificación (Drive, 19-11-2026) y le suma las reglas que se aplican desde la Etapa 15. **BORRADOR para confirmar**: los criterios de sprint y de entrega los redactó el asistente a partir de la práctica del proyecto.

## 1. Historia de usuario o tarea

Una historia está **Lista** cuando se cumple todo lo siguiente:

1. Cumple los **criterios de aceptación** de su historia en Jira.
2. `npm run test` pasa completo (y `npm run test:db` cuando se toca la capa de PostgreSQL).
3. Se cubren los **8 escenarios mínimos** del documento de requisitos (búsqueda, los cuatro filtros individuales, combinación de filtros, detalle de evento y API interna).
4. Ninguna prueba queda como `skip` o `todo` sin justificación explícita.
5. `npm run lint` no reporta errores y `npm run build` compila.
6. Si cambia la base de datos: la migración está escrita, aplicada y probada, y el modelo de datos actualizado ([`MODELO-DE-DATOS.md`](MODELO-DE-DATOS.md)).
7. El **README** y la documentación técnica están actualizados.
8. Los commits siguen la convención del proyecto (`feat:`, `fix:`, `docs:`, `chore:`, `test:`).
9. Si es un pedido del usuario o cambia el alcance, queda registrado en Jira (etiqueta `pedido-usuario`).
10. **El usuario ejecuta el cambio en su propio equipo (Windows, Docker Desktop) y lo confirma.** Hasta entonces el trabajo queda «En revisión» en Jira y «pendiente de verificación» en la documentación; no se declara verificado ni se pasa a «Listo».

## 2. Sprint

Un sprint está **cerrado** cuando:

- Todas sus historias están Listas o se movieron explícitamente a otro sprint con su motivo (por ejemplo, HU-29 pasó al Sprint 5 el 19-11-2026).
- Se hizo la demostración (Sprint Review) con la suite en verde.
- El Product Backlog y el Sprint Backlog del repositorio están actualizados con fecha.
- Se anotaron los aprendizajes en [`RETROSPECTIVAS.md`](RETROSPECTIVAS.md).

## 3. Entrega (versión presentable)

- La rama integrada compila, pasa lint y la suite completa, y se verificó con Docker.
- La documentación del repositorio refleja el estado real: **lo verificado se distingue de lo pendiente**.
- Los casos del plan oficial (.xlsx) están marcados OK o NOK, nunca «pendiente» ([`PLAN-DE-PRUEBAS.md`](PLAN-DE-PRUEBAS.md)).
- Las limitaciones conocidas están escritas, no ocultas.

## 4. Criterios adicionales para código con riesgo de seguridad (desde la Etapa 15)

- Toda ruta que exige sesión responde 401 sin sesión y 403 con el perfil equivocado, y tiene prueba.
- Toda acción que cambia datos comprueba el origen de la petición.
- Ningún secreto, contraseña real ni clave se escribe en archivos versionados ni en chats.
- La API pública nunca devuelve un evento que no esté publicado.
