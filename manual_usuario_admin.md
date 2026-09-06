# Manual de Usuario — Administrador y Raid Leader
## UWU Tracker (Lux Obscura — Final Fantasy XIV)

Esta guía está dirigida a los líderes, oficiales y organizadores de raid (*Raid Leaders*) de la Free Company **Lux Obscura**. Aquí aprenderás a gestionar miembros, analizar combinaciones de equipos generadas automáticamente, oficializar incursiones en el calendario y registrar el histórico semanal de la hermandad.

---

## Índice
1. [Acceso al Panel de Administrador](#1-acceso-al-panel-de-administrador)
2. [Gestión de Miembros y Contraseñas](#2-gestión-de-miembros-y-contraseñas)
3. [Detección y Exploración de Parties](#3-detección-y-exploración-de-parties)
4. [Oficializar y Programar una Incursión](#4-oficializar-y-programar-una-incursión)
5. [Cancelar o Modificar Incursiones](#5-cancelar-o-modificar-incursiones)
6. [Cierre Semanal y Registro Histórico (Snapshots)](#6-cierre-semanal-y-registro-histórico-snapshots)
7. [Buenas Prácticas para el Raid Leader](#7-buenas-prácticas-para-el-raid-leader)

---

## 1. Acceso al Panel de Administrador

Para activar las herramientas de gestión y programación:

1. Dirígete a la barra superior (Navbar) y haz clic en el botón con icono de escudo **"Panel Admin"**.
2. En la ventana emergente, introduce las credenciales de administración:
   - **Usuario**: `admin`
   - **Contraseña**: (la establecida para los oficiales de Lux Obscura, por defecto: `luxobscura2026`).
3. Al iniciar sesión correctamente:
   - Tu sesión cambiará a modo **Administrador** (lo notarás por la insignia dorada en el Navbar).
   - Se habilitarán botones especiales de gestión en las pestañas de *Parties*, *Histórico* y en el propio panel de administración.

---

## 2. Gestión de Miembros y Contraseñas

En cualquier momento puedes abrir el **"Panel Admin"** desde la barra superior para gestionar el padrón de la Free Company:

### A. Restablecer la Contraseña de un Miembro
Si un compañero olvidó su contraseña o tiene problemas para ingresar:
1. Abre el **Panel Admin**.
2. En la sección **"Gestión de Miembros de la FC"**, localiza al miembro en la lista.
3. Haz clic en el botón con icono de llave (**Resetear Clave**).
4. Escribe una nueva contraseña temporal para el miembro y confirma la acción.
5. Indícale al compañero su nueva clave para que pueda ingresar y actualizar sus datos.

### B. Depuración de Miembros
Si un integrante abandona la Free Company o deja de participar de forma definitiva:
1. Localiza su nombre en la lista de miembros del Panel Admin.
2. Haz clic en el icono de papelera (**Eliminar**).
3. Confirma la advertencia. Al eliminarlo, sus horarios y disponibilidad se retirarán del cálculo automático de grupos para mantener limpias las opciones.

---

## 3. Detección y Exploración de Parties

Dirígete a la pestaña **"Parties & Quórum"**. El sistema analiza en segundo plano todas las disponibilidades y muestra los bloques horarios donde es posible formar una party de 8 jugadores respetando las reglas de FFXIV:

- **1 Main Tank (MT)** y **1 Off Tank (OT)** con clases diferentes.
- **1 Pure Healer (PH)** (White Mage o Astrologian).
- **1 Shield Healer (SH)** (Scholar o Sage).
- **2 Melee DPS (M1, M2)** con clases diferentes.
- **1 Physical Ranged DPS (PR)** (Bard, Machinist o Dancer).
- **1 Magical Ranged DPS / Caster (C)** (Black Mage, Summoner, Red Mage o Pictomancer).

### ¿Cómo interpretar las combinaciones?
Al expandir un bloque horario con quórum verás una o más combinaciones posibles:

1. **Party Recomendada (Prioridad de Menor Progreso)**:  
   Aparecerá con un distintivo destacado. Es la formación calculada con el promedio de avance más bajo en UWU. Su propósito es impulsar a los compañeros que van en fases iniciales (Garuda, Ifrit o Titán) para que practiquen y no se queden estancados.
   
   Cada puesto muestra a la derecha el progreso con el que esa persona entra **a ese puesto**. Quien tenga activado el progreso por rol puede valer distinto en cada uno: un veterano como tanque que apenas ha jugado de caster entra al puesto de caster con su progreso de caster, no con el de tanque. Es lo que evita que un flex poco rodado pase por un main.
2. **Prioridad por Clases Principales (Main Jobs)**:  
   Las combinaciones que cuentan con más jugadores en su rol principal aparecen favorecidas frente a aquellas que requieren que varios jueguen clases secundarias (*flex*).
3. **Compañeros Listos para Rotar**:  
   Si en ese horario hay más de 8 personas disponibles, el sistema te muestra quiénes no quedaron en esa combinación específica. Recuerda que no son suplentes ni reservas; son opciones disponibles para futuras rotaciones o para armar una segunda combinación.

---

## 4. Oficializar y Programar una Incursión

Cuando decidas qué combinación de jugadores y horario es la ideal para la hermandad:

1. En la tarjeta de la combinación seleccionada, haz clic en el botón **"Oficializar Esta Party"** (solo visible con sesión de Admin activa).
2. Se abrirá la ventana de confirmación de la incursión:
   - **Horario de Inicio**: Verifica el día y la hora base programada.
   - **Duración Estimada**: Selecciona cuántas horas durará la sesión de raid (por ejemplo: 1 hora, 2 horas o 3 horas).
   - **Notas e Indicaciones para el Equipo (Opcional)**: Escribe recordatorios estratégicos, canal de voz de Discord a utilizar, o mecánicas en las que se enfocarán (ej. *"Hoy nos enfocamos en practicar Titán Limpio y transición a Ultima. Puntualidad en el canal de voz 1"*).
3. Haz clic en **"Confirmar y Oficializar Incursión"**.

### ¿Qué sucede al oficializar?
- La party se guarda con estado **CONFIRMADA**.
- Aparecerá inmediatamente en el **Banner de Próxima Incursión** en la pantalla principal (*El Nexo*) para todos los miembros.
- Los 8 compañeros convocados verán un distintivo personalizado avisándoles que están convocados con su respectivo job asignado.

---

## 5. Cancelar o Modificar Incursiones

Si surge un imprevisto o el grupo no podrá presentarse a una incursión ya oficializada:

1. Ve a la pestaña **"Parties & Quórum"** o al banner de la pantalla principal.
2. En la sección de **"Parties Oficiales Confirmadas"**, localiza la sesión correspondiente.
3. Haz clic en el botón de **"Cancelar Incursión"** (icono de papelera/cancelar).
4. Confirma la acción. La incursión se desprogramará y los horarios volverán a quedar abiertos como disponibles.

---

## 6. Cierre Semanal y Registro Histórico (Snapshots)

Para llevar la memoria de la Free Company y ver cómo avanza la curva de aprendizaje a lo largo del tiempo:

1. Dirígete a la pestaña **"Histórico"**.
2. En la esquina superior derecha verás el botón **"Cerrar Semana y Guardar Foto Histórica"**.
3. Haz clic sobre él y confirma la acción en la ventana del navegador.

### ¿Cuándo conviene tomar la foto histórica?
- **Momento recomendado**: Cada martes tras el reinicio semanal de servidores de *Final Fantasy XIV* (Weekly Reset), o al término de las sesiones del fin de semana.
- **Qué guarda**: Congela un resumen del progreso de todos los miembros en esa semana, calculando el promedio global de la FC y registrando cuántos miembros han alcanzado Garuda, Ifrit, Titán, Ultima Weapon y Enrage. De quien lleve progreso por rol se guarda el de su main job, que es el rol con el que se le cuenta en el roster y en el promedio.
- Permite que toda la hermandad compare las semanas anteriores y celebre el avance colectivo.

---

## 7. Buenas Prácticas para el Raid Leader

- **Uso de Zonas Horarias**: Antes de oficializar un horario, recuerda que el selector del Navbar permite ver la hora en CDMX (CST), Server Time (UTC) o costas este/oeste (EST/PST). Confirma siempre con los miembros la hora equivalente en su país.
- **Rotación Equitativa**: Utiliza la información de los "Compañeros listos para rotar". Si un miembro no entró en la party del viernes, priorízalo para la sesión del sábado o domingo.
- **Foco en el Aprendizaje**: Utiliza la prioridad de menor progreso para nivelar a los miembros nuevos antes de convocatorias mixtas de progresión avanzada en Ultima Weapon.
- **Cierre de Sesión Admin**: Cuando no estés organizando o gestionando, puedes cerrar la sesión de administrador en la esquina superior derecha para navegar como un miembro regular.
