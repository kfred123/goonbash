using System.Diagnostics;
using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddOpenApi();
var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
app.UseHttpsRedirection();

var lobbies = new ConcurrentDictionary<string, Lobby>();
var nextPort = 9000;

app.MapGet("/api/lobbies", () =>
{
    return Results.Ok(lobbies.Values);
});

app.MapPost("/api/lobbies/create", (CreateLobbyRequest req) =>
{
    var id = Guid.NewGuid().ToString();
    var port = Interlocked.Increment(ref nextPort);
    
    var process = new Process();
    var godotPath = builder.Configuration.GetValue<string>("GodotPath") ?? "godot";
    var projectPath = builder.Configuration.GetValue<string>("ProjectPath") ?? @"c:\projects\goonbash";
    
    process.StartInfo.FileName = godotPath;
    process.StartInfo.Arguments = $"--path \"{projectPath}\" --headless --server --port={port} --lobby-name=\"{req.Name}\"";
    process.StartInfo.UseShellExecute = false;
    process.EnableRaisingEvents = true;
    
    var lobby = new Lobby(id, req.Name, "127.0.0.1", port);
    lobbies.TryAdd(id, lobby);

    process.Exited += (sender, e) =>
    {
        lobbies.TryRemove(id, out _);
    };

    try 
    {
        process.Start();
    } 
    catch (Exception)
    {
        lobbies.TryRemove(id, out _);
        return Results.Problem("Failed to start server process.");
    }
    
    return Results.Ok(lobby);
});

app.Run();

public record CreateLobbyRequest(string Name);
public record Lobby(string Id, string Name, string Ip, int Port);
