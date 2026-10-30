# FutData — Correcciones de interfaz y permisos

## Cambios del código
- Retirada la pestaña **Análisis** y su pantalla (no se eliminan las estadísticas de Inicio).
- Renombrados textos visibles en inglés: Dashboard → Inicio, Overview → Inicio, Match Diary → Diario de partidos, Rating → Calificación, Logout → Cerrar sesión.
- El botón **Registrar partido** ya no aparece en Grupos, Partidos ni Canchas.
- Los errores de falta de permisos de las nuevas colecciones se explican en español con la acción necesaria.

## Importante: habilitar Firebase (esto NO se activa al subir archivos a Vercel o GitHub)
1. Entrá a https://console.firebase.google.com/ y seleccioná el **mismo proyecto Firebase** configurado en `firebase-applet-config.json`.
2. Abrí **Firestore Database → Reglas**.
3. Copiá el contenido **completo** de `firestore.rules` de este ZIP, revisalo y presioná **Publicar**.
4. Asegurate de iniciar sesión con Google en FutData antes de usar Grupos o Partidos: las reglas requieren una cuenta autenticada con correo verificado.
5. Recargá FutData y volvé a probar la creación de un grupo y una publicación de partido.

**No uses** `allow read, write: if true` ni deshabilites la autenticación: harías pública la información de todos.

Para comprobar que estás en el proyecto correcto, revisá el campo `projectId` de `firebase-applet-config.json`.

## Subir actualización
Reemplazá en tu repositorio los archivos de esta entrega conservando su estructura. Tu despliegue de Vercel se actualizará si está conectado al repositorio. Las reglas se publican **por separado** en Firebase.

## Alcance
Esta versión no implementa todavía acceso mediante contraseña a grupos, roles de administrador, reservas reales ni pagos. La compilación local no se pudo completar por dependencias incompletas en este entorno; verificá el build de Vercel.
