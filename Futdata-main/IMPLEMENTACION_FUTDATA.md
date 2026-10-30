# FutData — cambios en esta entrega

Partimos del ZIP original (React, TypeScript, Firebase/Firestore). No se reemplazó el diseño base.

## Incorporado
- Pestaña **Grupos**: crear/eliminar grupos privados del propietario, agregar nombres sin cuentas, seleccionar participantes, asignar a equipos manualmente o con aleatorización, renombrar equipos y guardar partidos, resultados, goles, asistencias y comentarios del organizador.
- Pestaña **Partidos**: publicar encuentros entre equipos completos por fecha, zona, cantidad de jugadores y modalidad amistoso/competitivo. Listar publicaciones y cerrar/reabrir las propias.
- Pestaña **Canchas**: sección informativa, sin reservas ni pagos ficticios.
- Reglas de Firestore para `groups` y `teamListings`, con acceso restringido a grupos del propietario.

## Pendientes importantes
- Invitación por nombre y contraseña del grupo, incorporación de miembros con identidad y asignación de administradores: requiere flujo seguro de membresía (NO guardar una contraseña de grupo en un documento legible en el cliente).
- Votaciones, valoraciones y etiquetas con autoría autenticada.
- Solicitudes entre líderes de equipos, aceptación y coordinación de rivales.
- Alta/gestión de complejos, turnos reales, reservas, expiración y cancelaciones.
- Integración con pasarela de pagos para cobrar el 50 % a cada líder y calcular $500 por jugador; la tarifa queda sujeta a validación.
- Pruebas de integración multiusuario, tests automatizados y despliegue.

## Configuración
1. `npm ci`
2. `npm run lint` y `npm run build`
3. Publicar **firestore.rules** en Firebase mediante herramientas administrativas.
4. Revisar variables y la configuración Firebase, permisos e índices del proyecto real.

**Estado de validación:** la instalación de dependencias no se completó en este entorno; por lo tanto no se pudo confirmar una compilación correcta. Probar localmente antes de desplegar.
