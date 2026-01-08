# SillyTavern Metronome Extension

A fully functional metronome extension for SillyTavern that allows the LLM to control tempo and timing through chat commands, with user-accessible controls and visual feedback. FULL DISCLAIMER: GLM 4.7 made the entire thing, it works more or less, doesn't work with streaming turned on, likely can be fixed. I needed a proof of concept for a biofeedback system, this is what I came up with. Installation is hit or miss I had to manually drop the files into my user extension folder and restart the server. 

## Features

-  **LLM-Controlled**: The LLM can start, stop, and adjust the metronome using simple chat commands
-  **BPM Control**: Adjustable tempo from 20-240 BPM with slider and number input
-  **Time Signatures**: Support for 1/1, 2/4, 3/4, 4/4, and 6/8 time signatures
-  **Volume Control**: Adjustable volume (0-100%) with real-time updates
-  **Tap Tempo**: Set BPM by tapping rhythm
-  **Visual Beat Indicator**: Real-time visual feedback showing current beat position
-  **Settings Persistence**: Automatically saves your preferences
-  **Modern UI**: Clean, responsive interface with smooth animations

## Installation

### Step 1: Create Extension Directory

1. Navigate to your SillyTavern extensions directory:
   - Windows: `public/scripts/extensions/`
   - Linux/Mac: `public/scripts/extensions/`

2. Create a new directory named `metronome`:
   ```
   mkdir metronome
   ```

### Step 2: Copy Files

Copy the following files into the `metronome` directory:
- `manifest.json`
- `style.css`
- `script.js`

Your directory structure should look like this:
```
public/scripts/extensions/metronome/
├── manifest.json
├── style.css
└── script.js
```

### Step 3: Restart SillyTavern

Restart SillyTavern to load the extension. The metronome will appear in the Extensions tab.

## Usage

### User Interface Controls

#### Start/Stop
Click the **START/STOP** button to start or stop the metronome.

#### Adjust Tempo (BPM)
- **Slider**: Drag the BPM slider to adjust tempo (20-240 BPM)
- **Number Input**: Type a specific BPM value and press Enter

#### Time Signature
Select a time signature from the dropdown:
- 1/1 - One beat per bar
- 2/4 - Two beats per bar
- 3/4 - Three beats per bar (waltz)
- 4/4 - Four beats per bar (common time)
- 6/8 - Six beats per bar

#### Volume Control
- Drag the volume slider to adjust the click volume (0-100%)
- Volume changes take effect immediately, even while the metronome is running

#### Tap Tempo
1. Click the **👆 Tap Tempo** button in rhythm with the desired tempo
2. Tap at least 2 times to calculate BPM
3. The last 4 taps are used to calculate the average tempo
4. Tap buffer resets after 2 seconds of inactivity

### LLM Commands

The LLM can control the metronome using these commands in chat:

#### Start the Metronome
```
[METRONOME: START]
```

#### Stop the Metronome
```
[METRONOME: STOP]
```

#### Set BPM
```
[METRONOME: BPM 120]
```
Replace `120` with any BPM value between 20 and 240.

#### Set Time Signature
```
[METRONOME: TIME 4]
```
Replace `4` with the number of beats per bar (1-8).

#### Set Volume
```
[METRONOME: VOLUME 75]
```
Replace `75` with any volume percentage between 0 and 100.

### Example LLM Interactions

**Example 1: Basic Start and Stop**
```
LLM: Let's practice at 120 BPM. [METRONOME: START]
...
LLM: That's enough for now. [METRONOME: STOP]
```

**Example 2: Adjust Tempo**
```
LLM: [METRONOME: BPM 100] Let's slow down a bit.
```

**Example 3: Change Time Signature**
```
LLM: Now let's try a waltz rhythm. [METRONOME: TIME 3]
```

**Example 4: Complete Control**
```
LLM: I'll set up a practice session. [METRONOME: START] [METRONOME: BPM 90] [METRONOME: TIME 4] [METRONOME: VOLUME 60]
```

**Example 5: System Prompt**
```
You have access to a controllable Metronome. You can control it by typing special commands in your messages.

To start the metronome, type: [METRONOME: START] To stop the metronome, type: [METRONOME: STOP] To change the speed (BPM), type: [METRONOME: BPM 120] (Replace 120 with any speed between 40 and 250). To change the time signature, type: [METRONOME: TIME 4] (Replace 4 with the desired number of beats per bar).

Example: I tap my foot to the rhythm. [METRONOME: BPM 90] [METRONOME: START] Let's play at this pace.
```
## Visual Feedback

### Beat Indicator
- **Blue dots**: Represent beats in the current bar
- **Green highlight**: Shows the current active beat
- **Pulse animation**: Visual feedback on each beat

### Status Display
- **Running (green)**: Metronome is playing
- **Stopped (red)**: Metronome is stopped

### Info Panel
- Displays current BPM, time signature, and volume percentage

## Technical Details

### Audio Generation
- Uses Web Audio API for precise timing
- Synthetic click sounds (no external audio files needed)
- Distinct sounds for downbeat (higher pitch) vs. other beats (lower pitch)
- Smooth envelope to prevent clicking artifacts

### Timing Precision
- Schedules beats ahead of time (100ms lookahead)
- Uses Web Audio API's timing system for millisecond accuracy
- Maintains accurate timing even in background tabs

### Settings Persistence
- Automatically saves BPM, time signature, and volume
- Settings persist across SillyTavern sessions
- Uses localStorage as fallback for storage

## Troubleshooting

### Metronome doesn't appear
- Ensure all three files are in the correct directory
- Check that `manifest.json` is valid JSON
- Restart SillyTavern after installing

### No sound
- Check that your browser supports Web Audio API
- Ensure your system volume is not muted
- Try clicking the START button to initialize audio
- Some browsers require user interaction before playing audio

### Timing issues
- Close other browser tabs that might be using audio
- Ensure your computer isn't under heavy CPU load
- Try restarting SillyTavern

### Tap tempo not working
- Tap at least 2 times to calculate BPM
- Ensure taps are within 2 seconds of each other
- Check browser console for errors

## Browser Compatibility

- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support (may require user interaction first)
- **Opera**: Full support

## Keyboard Shortcuts (Optional)

You can control the metronome using browser console:

```javascript
// Start metronome
window.metronomeExtension.start();

// Stop metronome
window.metronomeExtension.stop();

// Toggle metronome
window.metronomeExtension.toggle();

// Set BPM
window.metronomeExtension.setBPM(120);

// Set time signature (1-8 beats)
window.metronomeExtension.setTimeSignature(4);

// Set volume (0-100)
window.metronomeExtension.setVolume(50);

// Get current state
window.metronomeExtension.getState();
```

## File Structure

```
metronome/
├── manifest.json          # Extension metadata and configuration
├── style.css             # UI styling for metronome controls
├── script.js             # Core functionality (audio, timing, commands)
└── README.md             # This file
```

## License

This extension is provided as-is for use with SillyTavern.

## Support

For issues or suggestions:
1. Check the troubleshooting section above
2. Check the browser console for error messages
3. Verify all files are correctly installed

## Version History

### Version 1.0.0
- Initial release
- Basic metronome functionality
- LLM command parsing
- Tap tempo feature
- Volume control
- Visual beat indicator
- Settings persistence

## Credits


Created for SillyTavern users who want precise tempo control during roleplay sessions.
