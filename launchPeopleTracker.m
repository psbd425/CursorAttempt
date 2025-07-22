% People Availability Tracker in MATLAB using uihtml

% Set the path to your HTML file (adjust if your files are in a subfolder)
htmlFile = fullfile(pwd, 'index.html');

% Create a MATLAB UI figure
fig = uifigure('Name', 'People Availability Tracker', 'Position', [100 100 1100 700]);

% Add the HTML component
htmlComp = uihtml(fig, 'HTMLSource', htmlFile);

% (Optional) Set the component to fill the figure
htmlComp.Position = [1 1 fig.Position(3) fig.Position(4)];

% (Optional) Make the HTML component resize with the figure
fig.SizeChangedFcn = @(src, event) set(htmlComp, 'Position', [1 1 src.Position(3) src.Position(4)]);

% That's it! Your app will appear in the MATLAB window. 